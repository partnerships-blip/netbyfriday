import { LoginForm } from './LoginForm';

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string; deleted?: string } }) {
  return <LoginForm next={searchParams.next ?? '/overview'} error={searchParams.error} deleted={searchParams.deleted === '1'} />;
}
