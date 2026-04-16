import { Text, Link } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface UpgradeNudgeEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function UpgradeNudgeEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: UpgradeNudgeEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        You{"'"}ve been putting your credits to work — nice.
      </Text>
      <Text style={paragraph}>
        If you{"'"}re actively applying, here are your options to keep going:
      </Text>
      <Text style={paragraph}>
        → <strong>Pro Plan</strong> — 60 credits/month for $7.99
        <br />→ <strong>Ultimate Plan</strong> — 300 credits/month for $19.99
        <br />→ <strong>Credit Pack</strong> — 30 credits for $3.99 (one-time)
      </Text>
      <Text style={paragraph}>
        Every tailored resume gives you a better shot. No reason to send a
        generic one when it takes two minutes to customize.
      </Text>
      <Button href={`${BASE_URL}/pricing`}>See Plans</Button>
      <Text style={smallText}>
        All plans include: ATS scoring, cover letters, Word + PDF downloads, and
        the Job Tracker.
      </Text>
    </Layout>
  );
}

const paragraph = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#999",
  lineHeight: "1.5",
  marginTop: "24px",
};

export default UpgradeNudgeEmail;
