// src/pages/SignUpPage.tsx
import React from "react";
import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div style={styles.screen}>
      {/* Ambient glow blobs */}
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      {/* Dot-grid overlay */}
      <div style={styles.grid} />

      {/* Content */}
      <div style={styles.content}>
        {/* Brand */}
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🎙</span>
          <span style={styles.brandName}>HireGraph</span>
          <span style={styles.brandBadge}>Beta</span>
        </div>

        {/* Heading */}
        <div style={styles.heading}>
          <h1 style={styles.h1}>Create your account</h1>
          <p style={styles.subtitle}>
            Start practicing with AI-powered interviews today
          </p>
        </div>

        {/* Clerk card */}
        <div style={styles.clerkWrapper}>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
          />
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          Powered by AI &nbsp;·&nbsp; Trusted by top candidates
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--bg-base)",
    overflow: "hidden",
    padding: "clamp(1rem, 4vw, 2.5rem)",
    boxSizing: "border-box",
  },

  glowTop: {
    position: "absolute",
    top: "-15vh",
    left: "-10vw",
    width: "clamp(280px, 50vw, 600px)",
    height: "clamp(280px, 50vw, 600px)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  glowBottom: {
    position: "absolute",
    bottom: "-15vh",
    right: "-10vw",
    width: "clamp(200px, 40vw, 500px)",
    height: "clamp(200px, 40vw, 500px)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    pointerEvents: "none",
    zIndex: 0,
  },

  content: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "clamp(1rem, 2.5vw, 1.75rem)",
    width: "100%",
    maxWidth: "480px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },

  brandIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
  },

  brandName: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },

  brandBadge: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "var(--accent)",
    background: "var(--accent-dim)",
    border: "1px solid var(--accent-border)",
    borderRadius: "999px",
    padding: "2px 8px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  heading: {
    textAlign: "center",
  },

  h1: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(1.4rem, 4vw, 2rem)",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.025em",
    margin: 0,
    marginBottom: "0.4rem",
  },

  subtitle: {
    fontFamily: "var(--font-body)",
    fontSize: "clamp(0.85rem, 2vw, 1rem)",
    color: "var(--text-secondary)",
    margin: 0,
  },

  clerkWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },

  footer: {
    fontFamily: "var(--font-body)",
    fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
    color: "var(--text-muted)",
    textAlign: "center",
    margin: 0,
  },
};
