
async function runQaHarness() {
  const docId = 'doc_1335cca5-dc58-4286-84f0-d3fe4987fd13'; // Use our existing test doc
  
  const mockExpectedJson = {
    document_type: 'Citizenship',
    citizenship_no: '34-01-72-04561',
    full_name: 'Bhaskar Bhatt',
    date_of_birth: '2050-08-22 BS',
    sex: 'Male'
  };

  console.log('[1/4] Skipping DB seeding (need to hit API instead or mock it). Let us assume extraction fires first...');

  console.log('[2/4] Firing extraction pipeline...');
  const extractRes = await fetch('http://localhost:3000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docId,
      fields: [
        { name: 'document_type', type: 'string' },
        { name: 'citizenship_no', type: 'string' },
        { name: 'full_name', type: 'string' },
        { name: 'date_of_birth', type: 'string' },
        { name: 'sex', type: 'string', description: 'Male or Female' }
      ],
      systemPrompt: 'Extract fields strictly from the document.',
      settings: { arrayExtract: false, includeCitations: false },
      parseConfig: { extractionMode: 'hybrid', ocrSystem: 'standard' }
    })
  });

  if (!extractRes.ok) {
    throw new Error(`Extraction failed: ${await extractRes.text()}`);
  }

  const extractionResult = await extractRes.json();
  console.log('[3/4] Extraction complete. Running /api/eval...');

  const evalRes = await fetch('http://localhost:3000/api/eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId })
  });

  const evaluation = await evalRes.json();
  console.log('[4/4] Evaluation Results:', JSON.stringify(evaluation, null, 2));
}

runQaHarness().catch(console.error);
