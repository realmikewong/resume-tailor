"use client";

import { useState } from "react";

export type JobFormData = {
  company_name: string;
  job_title: string;
  job_description: string;
  pay_range_low: string;
  pay_range_high: string;
  job_location: string;
  location_type: "remote" | "hybrid" | "on-site" | "";
};

export function JobForm({
  initialData,
  onSubmit,
}: {
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
}) {
  const [form, setForm] = useState<JobFormData>({
    company_name: initialData?.company_name ?? "",
    job_title: initialData?.job_title ?? "",
    job_description: initialData?.job_description ?? "",
    pay_range_low: initialData?.pay_range_low ?? "",
    pay_range_high: initialData?.pay_range_high ?? "",
    job_location: initialData?.job_location ?? "",
    location_type: initialData?.location_type ?? "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company Name *</label>
          <input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Job Title *</label>
          <input
            name="job_title"
            value={form.job_title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Job Description *</label>
        <textarea
          name="job_description"
          value={form.job_description}
          onChange={handleChange}
          required
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Pay Range Low</label>
          <input
            name="pay_range_low"
            type="number"
            value={form.pay_range_low}
            onChange={handleChange}
            placeholder="e.g. 80000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pay Range High</label>
          <input
            name="pay_range_high"
            type="number"
            value={form.pay_range_high}
            onChange={handleChange}
            placeholder="e.g. 120000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location Type</label>
          <select
            name="location_type"
            value={form.location_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select...</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Job Location</label>
        <input
          name="job_location"
          value={form.job_location}
          onChange={handleChange}
          placeholder="e.g. San Francisco, CA"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <button
        type="submit"
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Continue
      </button>
    </form>
  );
}
