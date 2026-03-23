type ResumeData = {
  name: string;
  contact: {
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
  };
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    start_date: string;
    end_date: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    location?: string;
    year: string;
  }>;
  additional?: string[];
};

export function ResumePreview({ content }: { content: string }) {
  let data: ResumeData;
  try {
    data = JSON.parse(content);
  } catch {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2">Resume Preview</h2>
        <pre className="bg-white p-4 rounded-lg shadow-sm text-sm whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    );
  }

  const contactParts: string[] = [];
  if (data.contact.city && data.contact.state) {
    contactParts.push(`${data.contact.city}, ${data.contact.state}`);
  }
  if (data.contact.phone) contactParts.push(data.contact.phone);
  if (data.contact.email) contactParts.push(data.contact.email);
  if (data.contact.linkedin) contactParts.push(data.contact.linkedin);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium mb-2">Resume Preview</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm text-sm">
        {/* Name */}
        <h3 className="text-xl font-bold text-center">{data.name}</h3>
        <p className="text-center text-gray-500 text-xs mt-1">
          {contactParts.join(" | ")}
        </p>

        {/* Summary */}
        {data.summary && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide border-b pb-1 mb-2">
              Professional Summary
            </h4>
            <p className="text-gray-700">{data.summary}</p>
          </div>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide border-b pb-1 mb-2">
              Core Skills
            </h4>
            <p className="text-gray-700">{data.skills.join("  •  ")}</p>
          </div>
        )}

        {/* Experience */}
        {data.experience.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide border-b pb-1 mb-2">
              Professional Experience
            </h4>
            {data.experience.map((exp, i) => (
              <div key={i} className={i > 0 ? "mt-3" : ""}>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">
                    {exp.title} | {exp.company}
                  </span>
                  <span className="text-gray-500 text-xs whitespace-nowrap ml-2">
                    {exp.start_date} – {exp.end_date}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-gray-500 text-xs italic">{exp.location}</p>
                )}
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {exp.bullets.map((bullet, j) => (
                    <li key={j} className="text-gray-700">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide border-b pb-1 mb-2">
              Education
            </h4>
            {data.education.map((edu, i) => (
              <div key={i} className="flex justify-between items-baseline">
                <span>
                  <span className="font-semibold">{edu.degree}</span> — {edu.school}
                </span>
                <span className="text-gray-500 text-xs ml-2">{edu.year}</span>
              </div>
            ))}
          </div>
        )}

        {/* Additional */}
        {data.additional && data.additional.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide border-b pb-1 mb-2">
              Additional
            </h4>
            <ul className="list-disc list-inside space-y-0.5">
              {data.additional.map((item, i) => (
                <li key={i} className="text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
