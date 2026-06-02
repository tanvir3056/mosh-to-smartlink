"use client";

import { CheckCircle2, Mail, Target, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { saveTrackingSettingsAction } from "@/app/admin/actions";
import { FormStateMessage } from "@/components/admin/form-state";
import { Button } from "@/components/ui/button";
import type { EmailConnectorConfig, TrackingConfig } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" busy={pending} className="min-w-40">
      Save settings
    </Button>
  );
}

function fieldDescription(...ids: Array<string | false | null | undefined>) {
  const description = ids.filter(Boolean).join(" ");
  return description.length > 0 ? description : undefined;
}

function MailchimpStatusBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={
        connected
          ? "inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--app-green-line)] bg-[var(--app-green-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-green-text)]"
          : "inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--app-amber-line)] bg-[var(--app-amber-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-amber-text)]"
      }
    >
      <span
        aria-hidden="true"
        className={
          connected
            ? "h-1.5 w-1.5 rounded-full bg-[var(--app-green)]"
            : "h-1.5 w-1.5 rounded-full bg-[var(--app-amber)]"
        }
      />
      {connected ? "Connected" : "Local only"}
    </div>
  );
}

export function TrackingSettingsForm({
  config,
  connector,
  compactHeader = false,
  formId,
  showFooterSubmit = true,
}: {
  config: TrackingConfig;
  connector: EmailConnectorConfig;
  compactHeader?: boolean;
  formId?: string;
  showFooterSubmit?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveTrackingSettingsAction,
    INITIAL_ACTION_STATE,
  );
  const isMailchimpConnected = connector.hasApiKey && Boolean(connector.audienceId);
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(config.metaPixelEnabled);
  const metaPixelIdError = state.fieldErrors?.meta_pixel_id;
  const mailchimpAudienceIdError = state.fieldErrors?.mailchimp_audience_id;
  const mailchimpApiKeyError = state.fieldErrors?.mailchimp_api_key;

  return (
    <form id={formId} action={formAction} className="grid gap-6">
      <input type="hidden" name="site_name" value={config.siteName} />
      {!compactHeader ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="app-kicker text-[var(--app-muted)]">Configuration</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              Public defaults and Mailchimp
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
              Keep the public brand clean, then decide whether leads should sync outward.
            </p>
          </div>

          <div className="w-fit rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)]/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]">
            {isMailchimpConnected ? "Mailchimp connected" : "Local lead storage"}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="app-card overflow-hidden rounded-[var(--r-lg)] p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-line)] px-[18px] py-[15px]">
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                data-testid="tracking-section-icon"
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]"
              >
                <Target className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold text-[var(--app-text)]">
                  Meta Pixel
                </h3>
                <p className="mt-0.5 text-xs text-[var(--app-muted-2)]">
                  Track conversions for ads.
                </p>
              </div>
            </div>
            <label className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center">
              <input
                name="meta_pixel_enabled"
                type="checkbox"
                checked={metaPixelEnabled}
                onChange={(event) => setMetaPixelEnabled(event.currentTarget.checked)}
                className="peer sr-only"
                aria-label="Enable Meta Pixel"
              />
              <span className="absolute inset-0 rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)] transition peer-checked:border-[var(--app-accent-line)] peer-checked:bg-[var(--app-accent-soft)]" />
              <span className="absolute left-1 h-5 w-5 rounded-full bg-[var(--app-panel)] shadow-[0_1px_3px_oklch(0.2_0.02_270_/_0.18)] transition peer-checked:translate-x-5 peer-checked:bg-[var(--app-accent)]" />
            </label>
          </div>
          <div className="grid gap-4 p-[18px]">
            {metaPixelEnabled ? (
              <>
              <div className="grid gap-2">
                <label
                  htmlFor="meta-pixel-id"
                  className="text-sm font-medium text-[var(--app-text)]"
                >
                  Meta Pixel ID
                </label>
                <input
                  id="meta-pixel-id"
                  name="meta_pixel_id"
                  defaultValue={config.metaPixelId ?? ""}
                  className="app-input"
                  placeholder="123456789012345"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-invalid={Boolean(metaPixelIdError)}
                  aria-describedby={fieldDescription(
                    "meta-pixel-id-help",
                    metaPixelIdError && "meta-pixel-id-error",
                  )}
                />
                <span
                  id="meta-pixel-id-help"
                  className="text-xs leading-5 text-[var(--app-muted)]"
                >
                  Use digits only. Required before Meta Pixel can be enabled.
                </span>
                {metaPixelIdError ? (
                  <p id="meta-pixel-id-error" className="text-sm text-red-600">
                    {metaPixelIdError}
                  </p>
                ) : null}
              </div>

              <div
                data-testid="tracking-success-alert"
                className="rounded-[var(--r-md)] border border-[var(--app-green-line)] bg-[var(--app-green-soft)] px-4 py-3"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-green-text)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--app-green-text)]">
                      Pixel firing on all live pages
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-[var(--app-muted)]">
                      Events: PageView, ViewContent, and Lead.
                    </p>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <>
                <input type="hidden" name="meta_pixel_id" value={config.metaPixelId ?? ""} />
                <p className="text-[13.5px] leading-6 text-[var(--app-muted)]">
                  Enable to add your Meta Pixel to every published release page.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="app-card overflow-hidden rounded-[var(--r-lg)] p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--app-line)] px-[18px] py-[15px]">
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                data-testid="tracking-section-icon"
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]"
              >
                <Mail className="h-4 w-4" />
              </span>
              <div className="max-w-2xl">
                <h3 className="text-[14.5px] font-semibold text-[var(--app-text)]">
                  Mailchimp
                </h3>
                <p className="mt-0.5 text-xs text-[var(--app-muted-2)]">
                  Sync captured emails.
                </p>
              </div>
            </div>

            <MailchimpStatusBadge connected={isMailchimpConnected} />
          </div>

          <div className="grid gap-4 p-[18px]">
            <div className="grid gap-2">
              <label
                htmlFor="mailchimp-audience-id"
                className="text-sm font-medium text-[var(--app-text)]"
              >
                Audience ID
              </label>
              <input
                id="mailchimp-audience-id"
                name="mailchimp_audience_id"
                defaultValue={connector.audienceId ?? ""}
                className="app-input"
                placeholder="a1b2c3d4e5"
                aria-invalid={Boolean(mailchimpAudienceIdError)}
                aria-describedby={fieldDescription(
                  mailchimpAudienceIdError && "mailchimp-audience-id-error",
                )}
              />
              {mailchimpAudienceIdError ? (
                <p id="mailchimp-audience-id-error" className="text-sm text-red-600">
                  {mailchimpAudienceIdError}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="mailchimp-api-key"
                className="text-sm font-medium text-[var(--app-text)]"
              >
                API key
              </label>
              <input
                id="mailchimp-api-key"
                name="mailchimp_api_key"
                type="password"
                className="app-input"
                placeholder={
                  connector.hasApiKey
                    ? "Leave blank to keep the saved key"
                    : "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21"
                }
                aria-invalid={Boolean(mailchimpApiKeyError)}
                aria-describedby={fieldDescription(
                  "mailchimp-api-key-help",
                  mailchimpApiKeyError && "mailchimp-api-key-error",
                )}
              />
              <span id="mailchimp-api-key-help" className="text-xs leading-5 text-[var(--app-muted)]">
                Use the full key, including the datacenter suffix like -us21.
              </span>
              {mailchimpApiKeyError ? (
                <p id="mailchimp-api-key-error" className="text-sm text-red-600">
                  {mailchimpApiKeyError}
                </p>
              ) : null}
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Default tags</span>
              <input
                name="mailchimp_default_tags"
                defaultValue={connector.defaultTags ?? ""}
                className="app-input"
                placeholder="smart-link, release-campaign"
              />
            </label>

            <div className="grid gap-3">
              <label className="app-card-soft flex items-start gap-3 rounded-[var(--r-md)] px-4 py-3 text-sm text-[var(--app-text)]">
                <input
                  name="mailchimp_double_opt_in"
                  type="checkbox"
                  defaultChecked={connector.doubleOptIn}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-transparent"
                />
                <span className="grid gap-1">
                  <span className="font-medium">Require double opt-in</span>
                  <span className="text-[12.5px] leading-5 text-[var(--app-muted)]">
                    Fans confirm via email before they&apos;re added.
                  </span>
                </span>
              </label>

              {connector.hasApiKey ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[12.5px] leading-5 text-[var(--app-muted)]">
                    Saved key is encrypted at rest.
                  </span>
                  <Button
                    type="submit"
                    tone="danger-ghost"
                    name="mailchimp_clear_api_key"
                    value="on"
                    className="min-h-8 px-3 text-[12.5px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear saved key
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <FormStateMessage error={state.error} success={state.success} />

      {showFooterSubmit ? (
        <div className="flex flex-col gap-4 border-t border-[var(--app-line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-7 text-[var(--app-muted)]">
            Song-specific download offers still live inside each release editor.
          </p>
          <SubmitButton />
        </div>
      ) : null}
    </form>
  );
}
