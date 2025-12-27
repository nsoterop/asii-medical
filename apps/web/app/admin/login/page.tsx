import LoginForm from './LoginForm';

export default function AdminLoginPage() {
  const defaultSecret = process.env.ADMIN_SHARED_SECRET;

  return <LoginForm defaultSecret={defaultSecret} />;
}
