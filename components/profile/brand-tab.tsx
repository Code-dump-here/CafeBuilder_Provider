"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Award,
  BadgeCheck,
  Globe,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResetOnChange } from "@/hooks/use-reset-on-change";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddressPicker } from "@/components/ui/address-picker";
import { directionsUrl, type PickedLocation } from "@/lib/maps";
import { TileMap } from "@/components/ui/tile-map";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useAddCertificateMutation,
  useAddServiceAreaMutation,
  useAddSocialLinkMutation,
  useProviderBrand,
  useRemoveCertificateMutation,
  useRemoveServiceAreaMutation,
  useRemoveSocialLinkMutation,
  useUpdateProviderBrandMutation,
} from "@/features/service-provider-profiles/use-brand";
import {
  CERTIFICATE_KINDS,
  SOCIAL_PLATFORMS,
  type CertificateKind,
  type ProviderCertificate,
  type ProviderServiceArea,
  type ProviderSocialLink,
  type SocialPlatform,
} from "@/features/service-provider-profiles/brand-types";

interface BrandTabProps {
  serviceProviderProfileId: string;
  /** False for an owner looking at someone else's profile. */
  editable: boolean;
}

/**
 * The brand an owner sees before deciding to hire: logo, cover, intro video,
 * story, where the provider works, and what they are certified for.
 *
 * Certificates carry an `isVerified` flag only an admin can set. The provider
 * can add and describe one but cannot mark their own as checked, so this shows
 * the badge without ever offering a control for it.
 */
export function BrandTab({ serviceProviderProfileId, editable }: BrandTabProps) {
  const t = useTranslations("ProviderBrand");

  const { brand, isLoading } = useProviderBrand({ serviceProviderProfileId });

  const [editingBrand, setEditingBrand] = React.useState(false);
  const [addingLink, setAddingLink] = React.useState(false);
  const [addingArea, setAddingArea] = React.useState(false);
  const [addingCert, setAddingCert] = React.useState(false);
  const [removingLink, setRemovingLink] = React.useState<ProviderSocialLink | null>(null);
  const [removingArea, setRemovingArea] = React.useState<ProviderServiceArea | null>(null);
  const [removingCert, setRemovingCert] = React.useState<ProviderCertificate | null>(null);

  const updateBrand = useUpdateProviderBrandMutation();
  const addLink = useAddSocialLinkMutation();
  const removeLink = useRemoveSocialLinkMutation();
  const addArea = useAddServiceAreaMutation();
  const removeArea = useRemoveServiceAreaMutation();
  const addCert = useAddCertificateMutation();
  const removeCert = useRemoveCertificateMutation();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!brand) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
        {t("unavailable")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {brand.displayName}
              {brand.isVerified ? (
                <BadgeCheck className="size-4 text-primary" aria-label={t("verified")} />
              ) : null}
            </CardTitle>
            <CardDescription>{t("identity.subtitle")}</CardDescription>
          </div>
          {editable ? (
            <Button variant="outline" size="sm" onClick={() => setEditingBrand(true)}>
              <Pencil aria-hidden />
              {t("identity.edit")}
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-4 p-4 pt-0">
          {brand.coverImageViewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.coverImageViewUrl}
              alt=""
              className="h-40 w-full rounded-lg object-cover"
            />
          ) : null}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact
              label={t("identity.foundedYear")}
              value={brand.foundedYear === null ? t("notSet") : String(brand.foundedYear)}
            />
            <Fact
              label={t("identity.employeeCount")}
              value={
                brand.employeeCount === null
                  ? t("notSet")
                  : t("identity.people", { count: brand.employeeCount })
              }
            />
            <Fact
              label={t("identity.yearsExperience")}
              value={
                brand.yearsExperience === null
                  ? t("notSet")
                  : t("identity.years", { count: brand.yearsExperience })
              }
            />
            <Fact
              label={t("identity.rating")}
              value={
                brand.reviewCount === 0
                  ? t("identity.noReviews")
                  : t("identity.ratingValue", {
                      rating: brand.avgRating,
                      count: brand.reviewCount,
                    })
              }
            />
          </div>

          {brand.brandStory ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t("identity.story")}
              </p>
              <p className="text-sm leading-relaxed">{brand.brandStory}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 text-sm">
            {brand.website ? (
              <a
                href={brand.website}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="size-4" aria-hidden />
                {t("identity.website")}
              </a>
            ) : null}
            {brand.introVideoViewUrl ? (
              <a
                href={brand.introVideoViewUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Video className="size-4" aria-hidden />
                {t("identity.introVideo")}
              </a>
            ) : null}
            {brand.companyAddress ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                {brand.companyAddress}
              </span>
            ) : null}
          </div>

          {/* Where the business actually is, which is what an owner is really
              asking when they read the address — a province name doesn't tell
              them whether this provider is an hour away or five.
              Distinct from Service Areas below: those are where the provider
              takes work, this is where they are. Renders only when pinned. */}
          {brand.companyLatitude != null && brand.companyLongitude != null ? (
            <a
              href={directionsUrl(brand.companyLatitude, brand.companyLongitude)}
              target="_blank"
              rel="noreferrer noopener"
              className="block overflow-hidden rounded-lg border border-border/60 transition-shadow hover:shadow-md"
              aria-label={t("identity.openAddressInMaps")}
            >
              {/* Fixed pixel box — the tile grid is laid out against these
                  numbers, and a fluid width would offset the centre pin. */}
              <TileMap
                latitude={brand.companyLatitude}
                longitude={brand.companyLongitude}
                width={640}
                height={180}
                className="max-w-full"
              />
            </a>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Social links ─────────────────────────────────────────────────── */}
      <ListCard
        icon={Link2}
        title={t("links.title")}
        subtitle={t("links.subtitle")}
        empty={t("links.empty")}
        addLabel={t("links.add")}
        editable={editable}
        onAdd={() => setAddingLink(true)}
        rows={brand.socialLinks.map((link) => ({
          id: link.id,
          primary: t(`platform.${link.platform}`),
          secondary: link.label ?? link.url,
          href: link.url,
          onRemove: () => setRemovingLink(link),
        }))}
      />

      {/* ── Service areas ────────────────────────────────────────────────── */}
      <ListCard
        icon={MapPin}
        title={t("areas.title")}
        subtitle={t("areas.subtitle")}
        empty={t("areas.empty")}
        addLabel={t("areas.add")}
        editable={editable}
        onAdd={() => setAddingArea(true)}
        rows={brand.serviceAreas.map((area) => ({
          id: area.id,
          primary: area.district ? `${area.district}, ${area.province}` : area.province,
          secondary: area.note ?? "",
          onRemove: () => setRemovingArea(area),
        }))}
      />

      {/* ── Certificates ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-primary" aria-hidden />
              {t("certificates.title")}
            </CardTitle>
            <CardDescription>{t("certificates.subtitle")}</CardDescription>
          </div>
          {editable ? (
            <Button variant="outline" size="sm" onClick={() => setAddingCert(true)}>
              <Plus aria-hidden />
              {t("certificates.add")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-0">
          {brand.certificates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              {t("certificates.empty")}
            </p>
          ) : (
            brand.certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <Badge variant="outline">{t(`certificateKind.${cert.kind}`)}</Badge>
                    {cert.name}
                    {cert.isVerified ? (
                      <Badge variant="secondary">
                        <BadgeCheck className="size-3" aria-hidden />
                        {t("certificates.verified")}
                      </Badge>
                    ) : null}
                    {cert.isExpired ? (
                      <Badge variant="destructive">{t("certificates.expired")}</Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[cert.issuer, cert.certificateNo, cert.issuedAt]
                      .filter(Boolean)
                      .join(" · ") || t("certificates.noDetail")}
                  </p>
                </div>
                {editable ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemovingCert(cert)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                    <span className="sr-only">{t("certificates.remove")}</span>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <BrandDialog
        open={editingBrand}
        onOpenChange={setEditingBrand}
        initial={brand}
        pending={updateBrand.isPending}
        onSubmit={(payload) =>
          updateBrand.mutate(
            { serviceProviderProfileId, payload },
            { onSuccess: () => setEditingBrand(false) },
          )
        }
      />

      <SocialLinkDialog
        open={addingLink}
        onOpenChange={setAddingLink}
        pending={addLink.isPending}
        onSubmit={(payload) =>
          addLink.mutate(
            { serviceProviderProfileId, payload },
            { onSuccess: () => setAddingLink(false) },
          )
        }
      />

      <ServiceAreaDialog
        open={addingArea}
        onOpenChange={setAddingArea}
        pending={addArea.isPending}
        onSubmit={(payload) =>
          addArea.mutate(
            { serviceProviderProfileId, payload },
            { onSuccess: () => setAddingArea(false) },
          )
        }
      />

      <CertificateDialog
        open={addingCert}
        onOpenChange={setAddingCert}
        pending={addCert.isPending}
        onSubmit={(payload) =>
          addCert.mutate(
            { serviceProviderProfileId, payload },
            { onSuccess: () => setAddingCert(false) },
          )
        }
      />

      <ConfirmDialog
        open={removingLink !== null}
        onOpenChange={(next) => {
          if (!next) setRemovingLink(null);
        }}
        title={t("links.removeTitle")}
        description={t("links.removeDescription")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removingLink) removeLink.mutate(removingLink.id);
          setRemovingLink(null);
        }}
      />
      <ConfirmDialog
        open={removingArea !== null}
        onOpenChange={(next) => {
          if (!next) setRemovingArea(null);
        }}
        title={t("areas.removeTitle")}
        description={t("areas.removeDescription")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removingArea) removeArea.mutate(removingArea.id);
          setRemovingArea(null);
        }}
      />
      <ConfirmDialog
        open={removingCert !== null}
        onOpenChange={(next) => {
          if (!next) setRemovingCert(null);
        }}
        title={t("certificates.removeTitle")}
        description={t("certificates.removeDescription")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (removingCert) removeCert.mutate(removingCert.id);
          setRemovingCert(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

interface ListRow {
  id: string;
  primary: string;
  secondary: string;
  href?: string;
  onRemove: () => void;
}

function ListCard({
  icon: Icon,
  title,
  subtitle,
  empty,
  addLabel,
  editable,
  onAdd,
  rows,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  empty: string;
  addLabel: string;
  editable: boolean;
  onAdd: () => void;
  rows: ListRow[];
}) {
  const t = useTranslations("ProviderBrand");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-primary" aria-hidden />
            {title}
          </CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        {editable ? (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus aria-hidden />
            {addLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium">{row.primary}</p>
                {row.secondary ? (
                  row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-xs text-primary hover:underline"
                    >
                      {row.secondary}
                    </a>
                  ) : (
                    <p className="truncate text-xs text-muted-foreground">
                      {row.secondary}
                    </p>
                  )
                ) : null}
              </div>
              {editable ? (
                <Button variant="ghost" size="icon" onClick={row.onRemove}>
                  <Trash2 className="size-4 text-destructive" aria-hidden />
                  <span className="sr-only">{t("common.remove")}</span>
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogs

function BrandDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: {
    logoUrl: string | null;
    coverImageUrl: string | null;
    introVideoUrl: string | null;
    website: string | null;
    brandStory: string | null;
    companyAddress: string | null;
    companyLatitude: number | null;
    companyLongitude: number | null;
    foundedYear: number | null;
    employeeCount: number | null;
  };
  pending: boolean;
  onSubmit: (payload: {
    logoUrl?: string;
    coverImageUrl?: string;
    introVideoUrl?: string;
    website?: string;
    brandStory?: string;
    companyAddress?: string;
    companyLatitude?: number;
    companyLongitude?: number;
    clearCompanyCoordinates?: boolean;
    foundedYear?: number;
    employeeCount?: number;
  }) => void;
}) {
  const t = useTranslations("ProviderBrand");

  const [logoUrl, setLogoUrl] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [introVideoUrl, setIntroVideoUrl] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [brandStory, setBrandStory] = React.useState("");
  // Address and pin travel as one value, because the picker resolves both at
  // once and a pin separated from the text it belongs to is meaningless.
  const [companyLocation, setCompanyLocation] = React.useState<PickedLocation>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [foundedYear, setFoundedYear] = React.useState("");
  const [employeeCount, setEmployeeCount] = React.useState("");

  useResetOnChange(open, () => {
    setLogoUrl(initial.logoUrl ?? "");
    setCoverImageUrl(initial.coverImageUrl ?? "");
    setIntroVideoUrl(initial.introVideoUrl ?? "");
    setWebsite(initial.website ?? "");
    setBrandStory(initial.brandStory ?? "");
    setCompanyLocation({
      address: initial.companyAddress ?? "",
      latitude: initial.companyLatitude,
      longitude: initial.companyLongitude,
    });
    setFoundedYear(initial.foundedYear === null ? "" : String(initial.foundedYear));
    setEmployeeCount(initial.employeeCount === null ? "" : String(initial.employeeCount));
  });

  const num = (value: string) => {
    const parsed = Number(value.trim());
    return value.trim() === "" || !Number.isFinite(parsed) ? undefined : parsed;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("identity.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("identity.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("identity.logoUrl")} value={logoUrl} onChange={setLogoUrl} />
          <Field
            label={t("identity.coverImageUrl")}
            value={coverImageUrl}
            onChange={setCoverImageUrl}
          />
          <Field
            label={t("identity.introVideoUrl")}
            value={introVideoUrl}
            onChange={setIntroVideoUrl}
            placeholder="https://youtube.com/watch?v=…"
          />
          <Field label={t("identity.website")} value={website} onChange={setWebsite} />
          <Field
            label={t("identity.foundedYear")}
            value={foundedYear}
            onChange={setFoundedYear}
            type="number"
          />
          <Field
            label={t("identity.employeeCount")}
            value={employeeCount}
            onChange={setEmployeeCount}
            type="number"
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("identity.companyAddress")}</label>
            <AddressPicker
              value={companyLocation}
              onChange={setCompanyLocation}
              placeholder={t("identity.companyAddressPlaceholder")}
              labels={{
                pinned: t("identity.addressPinned"),
                textOnly: t("identity.addressTextOnly"),
                clear: t("identity.addressClear"),
                searching: t("identity.addressSearching"),
                noResults: t("identity.addressNoResults"),
                unavailable: t("identity.addressUnavailable"),
                placeFirstPin: t("identity.addressPlaceFirstPin"),
                adjust: t("identity.addressAdjust"),
                adjustDone: t("identity.addressAdjustDone"),
                dragHint: t("identity.addressDragHint"),
                zoomIn: t("identity.addressZoomIn"),
                zoomOut: t("identity.addressZoomOut"),
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">{t("identity.story")}</label>
            <Textarea
              rows={4}
              value={brandStory}
              placeholder={t("identity.storyPlaceholder")}
              onChange={(e) => setBrandStory(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSubmit({
                logoUrl: logoUrl.trim() || undefined,
                coverImageUrl: coverImageUrl.trim() || undefined,
                introVideoUrl: introVideoUrl.trim() || undefined,
                website: website.trim() || undefined,
                brandStory: brandStory.trim() || undefined,
                companyAddress: companyLocation.address.trim() || undefined,
                // Only send a pin that still belongs to the address on screen.
                // Editing the text after picking a suggestion clears the
                // coordinates in `AddressPicker`, so this is already null then.
                companyLatitude: companyLocation.latitude ?? undefined,
                companyLongitude: companyLocation.longitude ?? undefined,
                // The saved pin has to be told to go, since an omitted field
                // means "leave it". Only sent when there *was* one to remove,
                // so an ordinary edit doesn't carry a no-op flag.
                clearCompanyCoordinates:
                  companyLocation.latitude == null && initial.companyLatitude != null
                    ? true
                    : undefined,
                foundedYear: num(foundedYear),
                employeeCount: num(employeeCount),
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SocialLinkDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (payload: { platform: SocialPlatform; url: string; label?: string }) => void;
}) {
  const t = useTranslations("ProviderBrand");
  const [platform, setPlatform] = React.useState<string>("facebook");
  const [url, setUrl] = React.useState("");
  const [label, setLabel] = React.useState("");

  useResetOnChange(open, () => {
    setPlatform("facebook");
    setUrl("");
    setLabel("");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("links.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("links.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("links.platform")}</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORMS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`platform.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label={t("links.url")} value={url} onChange={setUrl} />
          <Field label={t("links.label")} value={label} onChange={setLabel} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={pending || url.trim().length === 0}
            onClick={() =>
              onSubmit({
                platform: platform as SocialPlatform,
                url: url.trim(),
                label: label.trim() || undefined,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceAreaDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (payload: { province: string; district?: string; note?: string }) => void;
}) {
  const t = useTranslations("ProviderBrand");
  const [province, setProvince] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [note, setNote] = React.useState("");

  useResetOnChange(open, () => {
    setProvince("");
    setDistrict("");
    setNote("");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("areas.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("areas.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label={t("areas.province")} value={province} onChange={setProvince} />
          <Field label={t("areas.district")} value={district} onChange={setDistrict} />
          <Field label={t("areas.note")} value={note} onChange={setNote} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={pending || province.trim().length === 0}
            onClick={() =>
              onSubmit({
                province: province.trim(),
                district: district.trim() || undefined,
                note: note.trim() || undefined,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CertificateDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (payload: {
    kind: CertificateKind;
    name: string;
    issuer?: string;
    certificateNo?: string;
    issuedAt?: string;
    expiresAt?: string;
    fileUrl?: string;
  }) => void;
}) {
  const t = useTranslations("ProviderBrand");
  const [kind, setKind] = React.useState<string>("certificate");
  const [name, setName] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [certificateNo, setCertificateNo] = React.useState("");
  const [issuedAt, setIssuedAt] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");

  useResetOnChange(open, () => {
    setKind("certificate");
    setName("");
    setIssuer("");
    setCertificateNo("");
    setIssuedAt("");
    setExpiresAt("");
    setFileUrl("");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("certificates.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("certificates.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t("certificates.kind")}</label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_KINDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`certificateKind.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label={t("certificates.name")} value={name} onChange={setName} />
          <Field label={t("certificates.issuer")} value={issuer} onChange={setIssuer} />
          <Field
            label={t("certificates.number")}
            value={certificateNo}
            onChange={setCertificateNo}
          />
          <Field
            label={t("certificates.issuedAt")}
            value={issuedAt}
            onChange={setIssuedAt}
            type="date"
          />
          <Field
            label={t("certificates.expiresAt")}
            value={expiresAt}
            onChange={setExpiresAt}
            type="date"
          />
          <div className="sm:col-span-2">
            <Field
              label={t("certificates.fileUrl")}
              value={fileUrl}
              onChange={setFileUrl}
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">{t("certificates.verifyNote")}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={pending || name.trim().length === 0}
            onClick={() =>
              onSubmit({
                kind: kind as CertificateKind,
                name: name.trim(),
                issuer: issuer.trim() || undefined,
                certificateNo: certificateNo.trim() || undefined,
                issuedAt: issuedAt || undefined,
                expiresAt: expiresAt || undefined,
                fileUrl: fileUrl.trim() || undefined,
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
