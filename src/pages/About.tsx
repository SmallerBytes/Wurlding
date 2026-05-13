import { Info } from 'lucide-react';
import { APP_AUTHOR, APP_NAME, APP_VERSION, COPYRIGHT, PROPRIETARY_NOTICE } from '../constants/appMeta';
import notices from '../data/thirdPartyNotices.json';

type PkgRow = { name: string; version: string; license: string; dev: boolean };

function npmPackageUrl(name: string) {
  return `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
}

function PackageTable({ rows, idPrefix }: { rows: PkgRow[]; idPrefix: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-mist">None listed.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-dusk/60">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-dusk/60 bg-abyss/80 text-xs uppercase tracking-wide text-mist">
            <th className="px-3 py-2 font-medium">Package</th>
            <th className="px-3 py-2 font-medium">Version</th>
            <th className="px-3 py-2 font-medium">License</th>
            <th className="px-3 py-2 font-medium">Registry</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={`${idPrefix}-${p.name}-${p.version}`} className="border-b border-dusk/40 last:border-0">
              <td className="px-3 py-2 font-mono text-xs text-moonlight">{p.name}</td>
              <td className="px-3 py-2 tabular-nums text-mist">{p.version}</td>
              <td className="px-3 py-2 text-mist">{p.license}</td>
              <td className="px-3 py-2">
                <a
                  href={npmPackageUrl(p.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-arcane hover:underline"
                >
                  npm
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function About() {
  const data = notices as {
    generatedAt: string;
    directRuntime: PkgRow[];
    directDevelopment: PkgRow[];
    runtime: PkgRow[];
    development: PkgRow[];
  };

  return (
    <div className="relative min-h-full max-w-3xl">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute top-0 right-1/4 h-64 w-64 rounded-full bg-arcane/10 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-2">
        <p className="mb-1 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
          <Info className="h-4 w-4 text-arcane" aria-hidden />
          About
        </p>
        <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">{APP_NAME}</h1>
        <p className="mt-2 text-sm text-mist leading-relaxed">
          Version <span className="tabular-nums text-silver">{APP_VERSION}</span>
        </p>
      </header>

      <section className="card mt-8 space-y-6 border-dusk/80 bg-shadow/40 p-6 sm:p-8">
        <div>
          <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Created by</h2>
          <p className="mt-2 text-moonlight">{APP_AUTHOR}</p>
        </div>

        <div>
          <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Copyright</h2>
          <p className="mt-2 text-sm text-mist leading-relaxed">{COPYRIGHT}</p>
        </div>

        <div>
          <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Use of this software</h2>
          <p className="mt-2 text-sm text-mist leading-relaxed">{PROPRIETARY_NOTICE}</p>
          <p className="mt-4 text-sm text-mist/90 leading-relaxed">
            If you distribute installers or sell access, consider a written license or terms that match
            what you allow. Technical measures alone cannot fully prevent copying of a desktop app;
            copyright notice and clear terms are what establish your rights.
          </p>
        </div>
      </section>

      <section className="card mt-6 space-y-6 border-dusk/80 bg-shadow/40 p-6 sm:p-8">
        <div>
          <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Third-party & open source</h2>
          <p className="mt-2 text-sm text-mist leading-relaxed">
            Wurlding includes third-party libraries distributed under their own licenses (MIT, ISC, Apache-2.0,
            etc.). The lists below are generated from your <span className="font-mono text-xs">package-lock.json</span>{' '}
            (updated when you run the build). This is not legal advice; keep the notices accurate when you add or
            remove dependencies.
          </p>
          <p className="mt-2 text-xs text-mist/80">
            Generated{' '}
            <time dateTime={data.generatedAt} className="tabular-nums">
              {new Date(data.generatedAt).toLocaleString()}
            </time>
          </p>
        </div>

        <div>
          <h3 className="font-[Cinzel] text-base font-semibold text-silver">Direct dependencies (runtime)</h3>
          <p className="mt-2 mb-3 text-sm text-mist">
            Packages declared in <span className="font-mono text-xs">package.json</span> &quot;dependencies&quot; — these
            are the main open-source components your app relies on.
          </p>
          <PackageTable rows={data.directRuntime} idPrefix="dr" />
        </div>

        <div>
          <h3 className="font-[Cinzel] text-base font-semibold text-silver">Direct dependencies (development)</h3>
          <p className="mt-2 mb-3 text-sm text-mist">
            Used to build and test the app; typically not shipped to end users, but listed for completeness.
          </p>
          <PackageTable rows={data.directDevelopment} idPrefix="dd" />
        </div>

        <details className="group rounded-lg border border-dusk/60 bg-abyss/40 p-4">
          <summary className="cursor-pointer font-[Cinzel] text-sm font-semibold text-moonlight">
            Full transitive runtime packages ({data.runtime.length})
          </summary>
          <p className="mt-2 mb-3 text-sm text-mist">
            Everything npm installs for production, including nested dependencies. Required for complete license
            attribution in many projects.
          </p>
          <div className="max-h-[min(420px,50vh)] overflow-y-auto pr-1">
            <PackageTable rows={data.runtime} idPrefix="tr" />
          </div>
        </details>

        <details className="group rounded-lg border border-dusk/60 bg-abyss/40 p-4">
          <summary className="cursor-pointer font-[Cinzel] text-sm font-semibold text-moonlight">
            Full transitive dev-only packages ({data.development.length})
          </summary>
          <p className="mt-2 mb-3 text-sm text-mist">
            Tooling pulled in at build time (e.g. bundler, types). Usually not part of the shipped app binary, but
            included here for a complete lockfile picture.
          </p>
          <div className="max-h-[min(420px,50vh)] overflow-y-auto pr-1">
            <PackageTable rows={data.development} idPrefix="td" />
          </div>
        </details>
      </section>
    </div>
  );
}
