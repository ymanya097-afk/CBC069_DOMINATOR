import React from 'react';
import { Database, ShieldAlert, CheckCircle2, Copy, Check } from 'lucide-react';

export const SetupScreen: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY');

  const snippet = `# AI Studio Secrets / .env Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-public-key"`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#082F49] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[6px] bg-[#0EA5E9]/8 flex items-center justify-center text-[#0EA5E9] dark:text-[#FFFFFF]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-lg text-[#075985] dark:text-[#FFFFFF]">
              House Hub &bull; Supabase Setup Required
            </h1>
            <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
              Connect your Supabase project to activate PostgreSQL and Supabase Auth
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[6px] bg-[#E0F2FE] dark:bg-[#7DD3FC]/15 border border-[#E0F2FE] dark:border-[#7DD3FC]/30 mb-6">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#075985] dark:text-[#FFFFFF] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#075985] dark:text-[#FFFFFF]">Missing Environment Variables</p>
              <ul className="mt-1 list-disc list-inside text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 space-y-0.5">
                {missing.map(m => (
                  <li key={m} className="font-mono text-[11px] font-semibold text-[#075985] dark:text-[#FFFFFF]">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
          <p className="font-medium text-[#075985] dark:text-[#FFFFFF]">
            How to configure:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>
              Open the <strong>Secrets panel</strong> in AI Studio (or configure your <code className="font-mono text-[11px]">.env</code> file).
            </li>
            <li>
              Add the two Supabase variables:
              <div className="mt-2 ml-4 space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#075985] dark:text-[#FFFFFF]">VITE_SUPABASE_URL</span>
                  <span>(and SUPABASE_URL for server)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#075985] dark:text-[#FFFFFF]">VITE_SUPABASE_ANON_KEY</span>
                  <span>(and SUPABASE_ANON_KEY for server)</span>
                </div>
              </div>
            </li>
            <li>Run the provided SQL script in your Supabase SQL Editor.</li>
            <li>Restart or refresh the application.</li>
          </ol>

          <div className="relative mt-4">
            <pre className="p-3 bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10 border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] font-mono text-[11px] text-[#075985] dark:text-[#FFFFFF] overflow-x-auto">
              {snippet}
            </pre>
            <button
              onClick={copySnippet}
              className="absolute top-2 right-2 p-1.5 rounded-[4px] bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF] transition"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#FFFFFF]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
