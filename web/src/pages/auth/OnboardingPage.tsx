import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { completeOnboarding } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { onboardingSchema, type OnboardingInput } from '@/utils/validation';
import { toMessage } from '@/utils/errors';

/** One-time step for a signed-in user who has no /users profile yet — the
 * only way that happens is a first Google sign-in, which never asked for a
 * business name. */
export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema) });

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    setFormError(null);
    try {
      await completeOnboarding(user, values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(toMessage(error));
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Set up your business</h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as {user?.email}. One more step before your dashboard is ready.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <Input
          label="Business name"
          placeholder="Adepa Fashion House"
          error={errors.businessName?.message}
          {...register('businessName')}
        />
        <Input
          label="Business phone"
          type="tel"
          placeholder="+233 20 000 0000"
          hint="Optional — you can add this later in Settings."
          error={errors.phone?.message}
          {...register('phone')}
        />

        {formError && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Create my workspace
        </Button>
      </form>
    </div>
  );
}
