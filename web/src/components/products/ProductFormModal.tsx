import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@/components/ui';
import { createProduct, updateProduct, type ProductImageChange } from '@/services';
import { productSchema, type ProductInput } from '@/utils/validation';
import { toMessage } from '@/utils/errors';
import { useToast } from '@/hooks/useToast';
import type { Product, WithId } from '@/types';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  /** null/undefined adds a new product; an existing product switches the modal to edit mode. */
  product?: WithId<Product> | null;
  categories: string[];
}

const BLANK: ProductInput = { name: '', description: '', price: 0, stock: 0, category: '', active: true };

export function ProductFormModal({ open, onClose, orgId, product, categories }: ProductFormModalProps) {
  const isEditing = Boolean(product);
  const toast = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: BLANK });

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            category: product.category,
            active: product.active,
          }
        : BLANK,
    );
    setImageFile(null);
    setImagePreview(product?.imageUrl ?? null);
    setImageRemoved(false);
    setFormError(null);
  }, [open, product, reset]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImageRemoved(false);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const onRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      if (product) {
        const imageChange: ProductImageChange | null = imageFile
          ? { file: imageFile }
          : imageRemoved
            ? { remove: true }
            : null;
        await updateProduct(orgId, product.id, values, imageChange, product.imagePath);
        toast.success('Product saved.');
      } else {
        const { imageFailed } = await createProduct(orgId, values, imageFile);
        toast.success(imageFailed ? 'Product created without image.' : 'Product added.');
      }
      onClose();
    } catch (error) {
      setFormError(toMessage(error));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      open={open}
      title={isEditing ? 'Edit product' : 'Add product'}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} loading={submitting}>
            {isEditing ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Product name" placeholder="Kente shoulder bag" error={errors.name?.message} {...register('name')} />

        <div>
          <label className="block text-sm font-semibold text-ink" htmlFor="product-description">
            Description
          </label>
          <textarea
            id="product-description"
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            placeholder="What a customer sees under the photo"
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-xs font-medium text-danger">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Price" type="number" step="0.01" min="0" error={errors.price?.message} {...register('price')} />
          <Input label="Stock" type="number" step="1" min="0" error={errors.stock?.message} {...register('stock')} />
        </div>

        <Input
          label="Category"
          list="product-category-options"
          placeholder="e.g. Shoes"
          error={errors.category?.message}
          {...register('category')}
        />
        <datalist id="product-category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            {...register('active')}
          />
          Active — visible to customers on WhatsApp
        </label>

        <div className="space-y-2">
          <p className="block text-sm font-semibold text-ink">Product image</p>
          {imagePreview && (
            <div className="h-28 w-28 overflow-hidden rounded-xl border border-line">
              <img src={imagePreview} alt="Product preview" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
            />
            {imagePreview && (
              <button type="button" onClick={onRemoveImage} className="text-xs font-semibold text-danger">
                Remove image
              </button>
            )}
          </div>
          <p className="text-xs text-muted">JPG or PNG, up to 5MB.</p>
        </div>

        {formError && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{formError}</p>
        )}

        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
