import { buildExtractionPrompt, parseExtractionResponse } from '@/lib/job-extractor';

describe('buildExtractionPrompt', () => {
  it('includes the raw text in the prompt', () => {
    const prompt = buildExtractionPrompt('Some job posting about Apple');
    expect(prompt).toContain('Some job posting about Apple');
  });

  it('instructs Claude to return JSON', () => {
    const prompt = buildExtractionPrompt('test');
    expect(prompt).toContain('JSON');
  });
});

describe('parseExtractionResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      company_name: 'Apple',
      job_title: 'Software Engineer',
      job_description: 'Build great products',
      pay_range_low: 120000,
      pay_range_high: 180000,
      job_location: 'Cupertino, CA',
      location_type: 'on-site',
      is_staffing_agency: false,
    });
    const result = parseExtractionResponse(json);
    expect(result.company_name).toBe('Apple');
    expect(result.job_title).toBe('Software Engineer');
    expect(result.is_staffing_agency).toBe(false);
  });

  it('strips markdown code fences before parsing', () => {
    const json = '```json\n{"company_name":"Apple","job_title":"Engineer","job_description":"Build things","pay_range_low":null,"pay_range_high":null,"job_location":"","location_type":"","is_staffing_agency":false}\n```';
    const result = parseExtractionResponse(json);
    expect(result.company_name).toBe('Apple');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseExtractionResponse('not json')).toThrow();
  });

  it('throws on missing required fields', () => {
    const json = JSON.stringify({ company_name: 'Apple' });
    expect(() => parseExtractionResponse(json)).toThrow();
  });
});
