import { Text } from "@react-email/components";
import { Layout } from "../components/layout";
import { Button } from "../components/button";

const BASE_URL = "https://taylorresume.com";

interface ResumeNudgeEmailProps {
  firstName: string | null;
  unsubscribeUrl: string;
}

export function ResumeNudgeEmail({
  firstName,
  unsubscribeUrl,
}: ResumeNudgeEmailProps) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  return (
    <Layout unsubscribeUrl={unsubscribeUrl}>
      <Text style={paragraph}>{greeting}</Text>
      <Text style={paragraph}>
        Quick one — have you uploaded your baseline resume yet?
      </Text>
      <Text style={paragraph}>
        It takes about 30 seconds. Once it's in, you can tailor it to any job
        posting without re-uploading.
      </Text>
      <Text style={paragraph}>Just drag and drop your Word doc or PDF.</Text>
      <Button href={`${BASE_URL}/dashboard/resumes`}>Upload Resume</Button>
      <Text style={smallText}>
        Tip: Use your most recent, complete resume. Taylor handles the tailoring
        — you just need the raw material.
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

export default ResumeNudgeEmail;
