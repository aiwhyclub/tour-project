import type { ReactNode } from 'react';

/** 여백이 넉넉한 섹션 셸. 한 화면에 정보를 몰아넣지 않는다. */
export function Section({
  id,
  title,
  description,
  children,
  className = '',
}: {
  id?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={'scroll-mt-24 py-14 sm:py-20 ' + className}
      aria-labelledby={title && id ? id + '-heading' : undefined}
    >
      {title && (
        <header className="mb-7 flex flex-col gap-2 sm:mb-9">
          <h2 id={id ? id + '-heading' : undefined} className="text-h1 text-ink">
            {title}
          </h2>
          {description && (
            <p className="max-w-[620px] text-body leading-relaxed text-ink-soft">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
