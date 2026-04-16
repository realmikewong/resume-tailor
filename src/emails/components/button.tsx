import { Button as ReactEmailButton } from "@react-email/components";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <ReactEmailButton
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        padding: "12px 32px",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "2px",
        textTransform: "uppercase" as const,
        textDecoration: "none",
        borderRadius: "0px",
      }}
    >
      {children}
    </ReactEmailButton>
  );
}
