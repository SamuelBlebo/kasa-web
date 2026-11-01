import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { registerMerchant, signInWithGoogle } from '@/services';
import { registerSchema, type RegisterInput } from '@/utils/validation';
import { toMessage } from '@/utils/errors';

export function SignupPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerMerchant(values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(toMessage(error));
    }
  });

  const onGoogleClick = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(toMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Takes a minute. You can connect WhatsApp right after.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <Input label="Your name" error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label="Business name"
          placeholder="Adepa Fashion House"
          error={errors.businessName?.message}
          {...register('businessName')}
        />
        <Input
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="+233 24 123 4567"
          hint="This is how you'll sign in."
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />

        {formError && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={googleLoading}
        onClick={onGoogleClick}
      >
        Continue with Google
      </Button>

      <p className="mt-6 text-sm text-muted">
        Already selling with us?{' '}
        <Link to="/login" className="font-semibold text-brand">
          Sign in
        </Link>
      </p>
    </div>
  );
}
