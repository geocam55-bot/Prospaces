// TEMPORARY TEST FILE - Delete after debugging
// This file tests if Tailwind CSS is working

export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          🎨 Tailwind CSS Test
        </h1>
        <div className="space-y-4">
          <p className="text-green-500">✅ If you see colors, Tailwind is working!</p>
          <p className="text-red-500">❌ If this is plain text, Tailwind is broken!</p>
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-blue-500 rounded"></div>
            <div className="w-20 h-20 bg-green-500 rounded"></div>
            <div className="w-20 h-20 bg-yellow-500 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
