import SetPasswordForm from './SetPasswordForm';

export default function Page({ searchParams }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : '';
  return <SetPasswordForm token={token} />;
}
