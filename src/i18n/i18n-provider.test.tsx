import { render, renderHook } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it } from "vitest";

import { I18nProvider, useI18n, useTranslations } from "@/i18n";

describe("i18n", () => {
  it("falls back to English without a provider", () => {
    const { result } = renderHook(() => useTranslations("pagination"));
    expect(result.current("next")).toBe("Next");
    expect(result.current("nope")).toBe("nope"); // unknown key → the key itself
  });

  it("interpolates variables", () => {
    const { result } = renderHook(() => useTranslations("pagination"));
    expect(result.current("page", { page: 2, total: 5 })).toBe("Page 2 of 5");
  });

  it("applies provider locale + overrides, falling back to en per key", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nProvider locale="es" messages={{ pagination: { next: "Siguiente" } }}>
        {children}
      </I18nProvider>
    );
    const { result } = renderHook(() => ({ t: useTranslations("pagination"), i18n: useI18n() }), {
      wrapper,
    });
    expect(result.current.t("next")).toBe("Siguiente");
    expect(result.current.t("previous")).toBe("Previous");
    expect(result.current.i18n.locale).toBe("es");
  });

  it("sets, updates, and restores the document language", () => {
    document.documentElement.lang = "en-US";

    const { rerender, unmount } = render(
      <I18nProvider locale="es">
        <span>Contenido</span>
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe("es");

    rerender(
      <I18nProvider locale="fr">
        <span>Contenu</span>
      </I18nProvider>,
    );
    expect(document.documentElement.lang).toBe("fr");

    unmount();
    expect(document.documentElement.lang).toBe("en-US");
  });

  it("can leave document language management to the host application", () => {
    document.documentElement.lang = "en-US";

    const { unmount } = render(
      <I18nProvider locale="es" setDocumentLanguage={false}>
        <span>Contenido</span>
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe("en-US");
    unmount();
    expect(document.documentElement.lang).toBe("en-US");
  });
});
