import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface WelcomeEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  unsubscribeUrl: string;
}

export function WelcomeEmail({
  firstName,
  creditsRemaining,
  unsubscribeUrl,
}: WelcomeEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>Welcome to Taylor Resumé.</Text>
      <Text style={paragraph}>
        You{"'"}ve got {creditsRemaining} free credits — each one turns your resume
        into a tailored, ATS-optimized version for a specific job. Plus a
        matching cover letter.
      </Text>
      <Text style={paragraph}>Here{"'"}s how it works:</Text>
      <Text style={paragraph}>
        1. Upload your baseline resume (just once)
        <br />
        2. Paste a job posting you{"'"}re interested in
        <br />
        3. Get a tailored resume + cover letter in minutes
      </Text>
      <Text style={paragraph}>Your first step: upload your resume.</Text>
      <Button href={`${BASE_URL}/dashboard/resumes`}>
        Upload Your Resume
      </Button>
      <Text style={smallText}>
        You have {creditsRemaining} credits remaining. No credit card required.
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

export default WelcomeEmail;
