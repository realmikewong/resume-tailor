import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";

interface LayoutProps {
  children: React.ReactNode;
  unsubscribeUrl: string;
}

export function Layout({ children, unsubscribeUrl }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#f6f6f6",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Accent bar */}
          <Section style={{ height: "3px", backgroundColor: "#1a1a1a" }} />

          {/* Header */}
          <Section style={{ padding: "36px 32px 0 32px" }}>
            <Text
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1a1a1a",
                letterSpacing: "3px",
                textTransform: "uppercase" as const,
                margin: "0 0 28px 0",
              }}
            >
              Taylor Resumé
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: "0 32px" }}>{children}</Section>

          {/* Footer */}
          <Section style={{ padding: "24px 32px 36px 32px" }}>
            <Hr style={{ borderColor: "#e5e5e5", margin: "0 0 16px 0" }} />
            <Text
              style={{
                fontSize: "12px",
                color: "#999",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              You{"'"}re receiving this because you signed up for Taylor Resumé.
              <br />
              <Link href={unsubscribeUrl} style={{ color: "#999" }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
