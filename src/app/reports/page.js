"use client";
import { useRouter } from 'next/navigation';
import Reports from '../components/Reports';

export default function ReportsPage() {
  const router = useRouter();
  const changePage = (name) => {
    // Basic back-to-dashboard behavior
    router.push('/');
  };
  return <Reports changePage={changePage} />;
}