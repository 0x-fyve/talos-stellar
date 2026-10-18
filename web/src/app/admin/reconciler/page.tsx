import type { Metadata } from "next";

import ReconcilerClient from "./reconciler-client";

export const metadata: Metadata = {
  title: "Reconciler — Admin",
  description: "Stellar finality reconciler status and records",
};

export default function ReconcilerAdminPage() {
  return (
    <main className="mx-auto w-full max-w-6l px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Reconciler
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor Stellar finality reconciliation, inspect stuck payments, and trigger a
          tick on demand.
        </p>
      </header>
      <ReconcilerClient />
    </main>
  );
}
