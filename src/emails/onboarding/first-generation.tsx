import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface FirstGenerationEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function FirstGenerationEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: FirstGenerationEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        If you{"'"}ve got a job posting you{"'"}re eyeing, now{"'"}s the time to try Taylor.
      </Text>
      <Text style={paragraph}>
        Paste the job description, pick a template (Modern, Classic, or
        Minimal), and Taylor will:
      </Text>
      <Text style={paragraph}>
        — Match your experience to what the role actually needs
        <br />
        — Rewrite your resume to speak to the job requirements
        <br />
        — Generate a matching cover letter
        <br />— Score your ATS compatibility before and after
      </Text>
      <Text style={paragraph}>
        The whole thing takes a few minutes. And it{"'"}s free — you{"'"}ve got{" "}
        {creditsRemaining} credits.
      </Text>
      <Button href={`${BASE_URL}/dashboard/jobs/new`}>
        Tailor Your First Resume
      </Button>
      <Text style={smallText}>
        Each credit = 1 tailored resume + cover letter + ATS score.
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

export default FirstGenerationEmail;
