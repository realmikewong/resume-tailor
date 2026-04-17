import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface SocialProofEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function SocialProofEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: SocialProofEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        Most people send the same resume everywhere and wonder why they don{"'"}t
        hear back. The ones who land interviews do something different — they
        tailor.
      </Text>
      <Text style={paragraph}>Taylor makes that easy:</Text>
      <Text style={paragraph}>
        — Paste the job posting
        <br />
        — Get a resume that speaks directly to what the employer wants
        <br />— Download and apply in minutes
      </Text>
      <Text style={paragraph}>
        You still have {creditsRemaining} credits. Each one is a chance to put
        your best foot forward for a role you care about.
      </Text>
      <Button href={`${BASE_URL}/dashboard/jobs/new`}>
        Tailor Another Resume
      </Button>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

export default SocialProofEmail;
