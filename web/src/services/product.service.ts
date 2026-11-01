import {
  addDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { productImagePath, productRef, productsRef, storage } from '@/firebase';
import type { ProductInput } from '@/utils/validation';

/** At or below this many units left, a product counts as low stock on the dashboard. */
export const LOW_STOCK_THRESHOLD = 5;

export const productsQuery = (orgId: string) =>
  query(productsRef(orgId), orderBy('createdAt', 'desc'));

/** What the WhatsApp bot is allowed to show a customer — mirrors the `active` check in the bot engine. */
export const activeProductsQuery = (orgId: string) =>
  query(productsRef(orgId), where('active', '==', true), orderBy('name'));

async function uploadProductImage(orgId: string, productId: string, file: File) {
  const path = productImagePath(orgId, productId, file.name);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);
  return { imageUrl, imagePath: path };
}

function deleteProductImage(imagePath: string) {
  return deleteObject(ref(storage, imagePath)).catch(() => {
    // Already gone, or never fully uploaded — nothing to clean up.
  });
}

export interface CreateProductResult {
  id: string;
  /** True when an image was selected but Storage rejected or failed the upload — the product still exists, with imageUrl: null. */
  imageFailed: boolean;
}

export async function createProduct(
  orgId: string,
  input: ProductInput,
  imageFile?: File | null,
): Promise<CreateProductResult> {
  const created = await addDoc(productsRef(orgId), {
    ...input,
    imageUrl: null,
    imagePath: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as never);

  if (!imageFile) {
    return { id: created.id, imageFailed: false };
  }

  try {
    const { imageUrl, imagePath } = await uploadProductImage(orgId, created.id, imageFile);
    await updateDoc(productRef(orgId, created.id), { imageUrl, imagePath } as never);
    return { id: created.id, imageFailed: false };
  } catch {
    // Storage may not be configured yet (common in early development) or the
    // upload itself failed — either way the product document already exists
    // with imageUrl: null, so creation should not be blocked by this.
    return { id: created.id, imageFailed: true };
  }
}

/** Pass `imageChange` only when the photo itself is changing: a new file, or an explicit removal. */
export type ProductImageChange = { file: File } | { remove: true };

export async function updateProduct(
  orgId: string,
  productId: string,
  patch: Partial<ProductInput>,
  imageChange?: ProductImageChange | null,
  previousImagePath?: string | null,
) {
  const updates: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };

  if (imageChange && 'file' in imageChange) {
    const { imageUrl, imagePath } = await uploadProductImage(orgId, productId, imageChange.file);
    updates.imageUrl = imageUrl;
    updates.imagePath = imagePath;
    if (previousImagePath) await deleteProductImage(previousImagePath);
  } else if (imageChange && 'remove' in imageChange) {
    updates.imageUrl = null;
    updates.imagePath = null;
    if (previousImagePath) await deleteProductImage(previousImagePath);
  }

  return updateDoc(productRef(orgId, productId), updates as never);
}

export async function deleteProduct(orgId: string, productId: string, imagePath?: string | null) {
  if (imagePath) await deleteProductImage(imagePath);
  return deleteDoc(productRef(orgId, productId));
}
