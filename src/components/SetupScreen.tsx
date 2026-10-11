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
    <div className="min-h-screen bg-[#fffeff] dark:bg-[#232b3d] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[6px] bg-[#3a6993]/8 flex items-center justify-center text-[#3a6993] dark:text-[#fffeff]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-lg text-[#232b3d] dark:text-[#fffeff]">
              House Hub &bull; Supabase Setup Required
            </h1>
            <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70">
              Connect your Supabase project to activate PostgreSQL and Supabase Auth
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[6px] bg-[#232b3d]/10 dark:bg-[#fffeff]/10 border border-[#232b3d]/12 dark:border-[#fffeff]/12 mb-6">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#232b3d] dark:text-[#fffeff] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#232b3d] dark:text-[#fffeff]">Missing Environment Variables</p>
              <ul className="mt-1 list-disc list-inside text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 space-y-0.5">
                {missing.map(m => (
                  <li key={m} className="font-mono text-[11px] font-semibold text-[#232b3d] dark:text-[#fffeff]">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70">
          <p className="font-medium text-[#232b3d] dark:text-[#fffeff]">
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
                  <span className="font-semibold text-[#232b3d] dark:text-[#fffeff]">VITE_SUPABASE_URL</span>
                  <span>(and SUPABASE_URL for server)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#232b3d] dark:text-[#fffeff]">VITE_SUPABASE_ANON_KEY</span>
                  <span>(and SUPABASE_ANON_KEY for server)</span>
                </div>
              </div>
            </li>
            <li>Run the provided SQL script in your Supabase SQL Editor.</li>
            <li>Restart or refresh the application.</li>
          </ol>

          <div className="relative mt-4">
            <pre className="p-3 bg-[#3a6993]/8 dark:bg-[#fffeff]/5 border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] font-mono text-[11px] text-[#232b3d] dark:text-[#fffeff] overflow-x-auto">
              {snippet}
            </pre>
            <button
              onClick={copySnippet}
              className="absolute top-2 right-2 p-1.5 rounded-[4px] bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff] transition"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
