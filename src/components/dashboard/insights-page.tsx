"use client";

export function InsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#2E2E2E]">Insights</h1>
      <p className="text-[#5C5B57]">
        Patterns and suggestions based on your memories will appear here.
      </p>
      <div className="rounded-lg border border-[#D8D0BF] bg-[#FFFDF9] p-8 text-center">
        <p className="text-[#9B9A96]">No insights yet — keep chatting with lurisa.</p>
      </div>
    </div>
  );
}

export default InsightsPage;
