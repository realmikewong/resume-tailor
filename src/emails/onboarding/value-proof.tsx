import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface ValueProofEmailProps {
  firstName: string | null;
  creditsRemaining: number;
  jobTitle: string | null;
  companyName: string | null;
  unsubscribeUrl: string;
}

export function ValueProofEmail({
  firstName,
  creditsRemaining,
  jobTitle,
  companyName,
  unsubscribeUrl,
}: ValueProofEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";
  const jobDescription =
    jobTitle && companyName
      ? `your first tailored resume for ${jobTitle} at ${companyName}`
      : "your first tailored resume";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>Nice — you{"'"}ve got {jobDescription}.</Text>
      <Text style={paragraph}>
        Here{"'"}s something worth knowing: over 75% of resumes are filtered out by
        ATS software before a recruiter ever sees them. Your tailored version is
        built to get through.
      </Text>
      <Text style={paragraph}>A few things you can do now:</Text>
      <Text style={paragraph}>
        — Download your resume and cover letter (Word + PDF)
        <br />
        — Check your ATS score comparison
        <br />— Add this job to your tracker to follow up
      </Text>
      <Text style={paragraph}>
        You{"'"}ve got {creditsRemaining} credits left. Every job you{"'"}re serious
        about deserves a tailored resume.
      </Text>
      <Button href={`${BASE_URL}/dashboard/jobs`}>View Your Generation</Button>
      <Text style={smallText}>
        Tip: Use the Job Tracker to keep tabs on where you{"'"}ve applied.
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

export default ValueProofEmail;
