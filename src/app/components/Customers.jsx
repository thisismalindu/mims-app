"use client";
import Link from "next/link";

export default function Customers() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h2>Customer Details</h2>
        <p>Here you can display customer-related data.</p>
      </div>
      <Link
        href="./create-customer"
        className="bg-blue-600 text-white p-4 rounded-lg cursor-pointer hover:bg-blue-700"
      >
        Create Customer
      </Link>
    </>
  );
}
