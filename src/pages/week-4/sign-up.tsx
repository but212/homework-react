import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import FormContainer from '@/components/FormContainer';
import { useToggleState } from '@/hooks';
import supabase from '@/lib/supabase';
import { cn } from '@/lib/utils';

// 폼 입력값 타입 정의
type SignupForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  bio?: string;
};

const SignUp = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignupForm>({
    mode: 'onChange',
  });

  const [showPassword, { toggle: toggleShowPassword }] = useToggleState(false);
  const [showConfirmPassword, { toggle: toggleShowConfirmPassword }] = useToggleState(false);

  const onSubmit = async (formData: SignupForm) => {
    if (isSubmitting) return;

    const { error, data } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          bio: formData.bio,
        },
        emailRedirectTo: `${window.location.origin}/week-4/home`,
      },
    });

    if (error) {
      toast.error(`회원가입 오류 발생 ${error.message}`);
    } else {
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session) {
          const { error: profileError } = await supabase.from('profile').insert({
            id: data.user.id,
            user_name: formData.name,
            email: data.user.email!,
            phone: '',
            bio: formData.bio || '',
          });

          if (profileError) {
            toast.error(`프로필 생성 오류: ${profileError.message}`);
          } else {
            toast.success(`회원가입 성공 ${formData.name}`);
            reset();
          }
        } else {
          toast.error('세션 생성에 실패했습니다. 다시 시도해주세요.');
        }
      } else {
        toast.error('회원정보를 저장할 수 없습니다.');
      }
    }
  };
  const password = watch('password');

  return (
    <FormContainer title='회원가입'>
      <form onSubmit={handleSubmit(onSubmit)} aria-label='회원가입 폼' autoComplete='off' noValidate>
        <div className='mb-4'>
          <label htmlFor='signup-name'>
            이름 <span className='text-red-500'>*</span>
          </label>
          <input
            type='text'
            id='signup-name'
            className={cn(
              'w-full',
              'px-3',
              'py-2',
              'border',
              'rounded',
              'focus:outline-none',
              'focus:ring',
              errors.name ? 'border-red-500 ring-red-300' : 'border-gray-300 focus:ring-blue-300'
            )}
            {...register('name', {
              required: '이름을 입력해주세요',
            })}
          />
          {errors.name && (
            <div id='signup-name-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.name.message}
            </div>
          )}
        </div>
        <div className='mb-4'>
          <label htmlFor='signup-email'>
            이메일 <span className='text-red-500'>*</span>
          </label>
          <input
            type='email'
            id='signup-email'
            className={cn(
              'w-full',
              'px-3',
              'py-2',
              'border',
              'rounded',
              'focus:outline-none',
              'focus:ring',
              errors.email ? 'border-red-500 ring-red-300' : 'border-gray-300 focus:ring-blue-300'
            )}
            {...register('email', {
              required: '이메일을 입력해주세요',
            })}
          />
          {errors.email && (
            <div id='signup-email-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.email.message}
            </div>
          )}
        </div>
        <div className='mb-4'>
          <label htmlFor='signup-bio'>소개(선택사항)</label>
          <textarea
            id='signup-bio'
            {...register('bio')}
            className={cn(
              'w-full',
              'px-3',
              'py-2',
              'border',
              'rounded',
              'focus:outline-none',
              'focus:ring',
              'border-gray-300',
              'focus:ring-blue-300',
              'resize-none'
            )}
            placeholder='자기소개를 입력해주세요'
          />
          {errors.bio && (
            <div id='signup-bio-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.bio.message}
            </div>
          )}
        </div>
        <div className='mb-4'>
          <label htmlFor='signup-password' className='block font-medium mb-1'>
            패스워드 <span className='text-red-500'>*</span>
          </label>
          <div className='relative'>
            <input
              id='signup-password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='off'
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'signup-password-error' : undefined}
              {...register('password', {
                required: '패스워드를 입력하세요.',
                minLength: {
                  value: 6,
                  message: '6자 이상 입력하세요.',
                },
                validate: (value: string) => {
                  if (!/[a-z]/.test(value)) return '영문 소문자가 하나 이상 포함되어야 합니다.';
                  if (!/[A-Z]/.test(value)) return '영문 대문자가 하나 이상 포함되어야 합니다.';
                  if (!/[0-9]/.test(value)) return '숫자가 하나 이상 포함되어야 합니다.';
                },
              })}
              className={cn(
                'w-full px-3 py-2 border rounded focus:outline-none focus:ring pr-12',
                errors.password ? 'border-red-500 ring-red-300' : 'border-gray-300 focus:ring-blue-300'
              )}
            />
            <button
              type='button'
              aria-label={showPassword ? '패스워드 감춤' : '패스워드 표시'}
              title={showPassword ? '패스워드 감춤' : '패스워드 표시'}
              aria-pressed={showPassword}
              className='cursor-pointer absolute right-2 top-2 px-2 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring focus:ring-blue-300'
              onClick={toggleShowPassword}
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {errors.password && (
            <div id='signup-password-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.password.message}
            </div>
          )}
        </div>
        <div className='mb-4'>
          <label htmlFor='signup-confirm-password' className='block font-medium mb-1'>
            패스워드 확인 <span className='text-red-500'>*</span>
          </label>
          <div className='relative'>
            <input
              id='signup-confirm-password'
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete='off'
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'signup-confirmPassword-error' : undefined}
              {...register('confirmPassword', {
                required: '패스워드 확인을 입력하세요',
                validate: v => v === password || '패스워드가 일치하지 않습니다',
              })}
              className={cn(
                'w-full px-3 py-2 border rounded focus:outline-none focus:ring pr-12',
                errors.confirmPassword ? 'border-red-500 ring-red-300' : 'border-gray-300 focus:ring-blue-300'
              )}
            />
            <button
              type='button'
              aria-label={showConfirmPassword ? '패스워드 감춤' : '패스워드 표시'}
              title={showConfirmPassword ? '패스워드 감춤' : '패스워드 표시'}
              aria-pressed={showConfirmPassword}
              className='cursor-pointer absolute right-2 top-2 px-2 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring focus:ring-blue-300'
              onClick={toggleShowConfirmPassword}
            >
              {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div id='signup-confirmPassword-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.confirmPassword.message}
            </div>
          )}
        </div>

        <button type='submit' className={cn('w-full bg-blue-500 text-white p-2 rounded')} disabled={isSubmitting}>
          {isSubmitting ? '회원가입 중...' : '회원가입'}
        </button>
      </form>
    </FormContainer>
  );
};

export default SignUp;
