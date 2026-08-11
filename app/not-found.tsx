import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div className="iris-eyebrow">404</div>
        <h1 className="iris-h1" style={{ marginTop: 8 }}>Project not found</h1>
        <p className="iris-sub">The project you&apos;re looking for doesn&apos;t exist or was removed.</p>
        <Link href="/" className="iris-btn iris-btn-primary" style={{ marginTop: 18 }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
