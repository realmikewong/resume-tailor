type CoverLetterData = {
  date?: string;
  applicant?: {
    name: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
  };
  recipient?: {
    name?: string;
    company?: string;
  };
  greeting: string;
  body: string[];
  signoff: string;
  name: string;
};

export function CoverLetterPreview({ content }: { content: string }) {
  let data: CoverLetterData;
  try {
    data = JSON.parse(content);
  } catch {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Cover Letter Preview</h2>
        <pre className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-medium mb-2">Cover Letter Preview</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm text-sm leading-relaxed">
        {/* Applicant info */}
        {data.applicant && (
          <div className="mb-4">
            <p className="font-semibold">{data.applicant.name}</p>
            {data.applicant.city && data.applicant.state && (
              <p className="text-gray-600">
                {data.applicant.city}, {data.applicant.state}
              </p>
            )}
            {(data.applicant.phone || data.applicant.email) && (
              <p className="text-gray-600">
                {[data.applicant.phone, data.applicant.email, data.applicant.linkedin]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            )}
          </div>
        )}

        {/* Date */}
        {data.date && <p className="mb-4 text-gray-600">{data.date}</p>}

        {/* Recipient */}
        {data.recipient && (
          <div className="mb-4">
            {data.recipient.name && <p>{data.recipient.name}</p>}
            {data.recipient.company && <p>{data.recipient.company}</p>}
          </div>
        )}

        {/* Greeting */}
        <p className="mb-4">{data.greeting}</p>

        {/* Body paragraphs */}
        {data.body.map((para, i) => (
          <p key={i} className="mb-4 text-gray-700">
            {para}
          </p>
        ))}

        {/* Sign-off */}
        <p className="mt-6">{data.signoff}</p>
        <p className="font-semibold">{data.name}</p>
      </div>
    </div>
  );
}
