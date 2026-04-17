import { Html, Body, Heading, Text, Container, Preview } from "@react-email/components";

type Props = { userEmail: string; userId: string; description: string };

export function FeatureRequestEmail({ userEmail, userId, description }: Props) {
  return (
    <Html>
      <Preview>New feature request from {userEmail}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "8px" }}>
          <Heading as="h1">New feature request</Heading>
          <Text><strong>From:</strong> {userEmail}</Text>
          <Text><strong>User ID:</strong> {userId}</Text>
          <Heading as="h2" style={{ fontSize: "18px", marginTop: "24px" }}>Request</Heading>
          <Text style={{ whiteSpace: "pre-wrap" }}>{description}</Text>
        </Container>
      </Body>
    </Html>
  );
}
