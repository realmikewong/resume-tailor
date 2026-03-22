export function TextPreview({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold">Extracted Resume Text</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}
