"use client";

import * as React from "react";
import { Check, Loader2, MapPin, Move, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { interactiveRow } from "@/lib/interactive";
import {
  DEFAULT_PROXIMITY,
  autocomplete,
  hasCoordinates,
  reverseGeocode,
  type PickedLocation,
  type PlaceSuggestion,
} from "@/lib/maps";
import { TileMap } from "@/components/ui/tile-map";
import { DraggableMap } from "@/components/ui/draggable-map";
import { cn } from "@/lib/utils";

export interface AddressPickerProps {
  value: PickedLocation | null;
  onChange: (value: PickedLocation) => void;
  placeholder?: string;
  labels: {
    /** Shown under the field when a pin is attached. */
    pinned: string;
    /** Shown under the field when the address is text only. */
    textOnly: string;
    clear: string;
    searching: string;
    /** Shown in place of the suggestion list when nothing matches. */
    noResults: string;
    /** Shown instead of the field when no Maps key is configured. */
    unavailable: string;
    /** Prompt under the map when nothing has been picked yet. */
    placeFirstPin: string;
    /** Opens drag-to-move mode on the map. */
    adjust: string;
    adjustDone: string;
    dragHint: string;
    zoomIn: string;
    zoomOut: string;
  };
  disabled?: boolean;
  className?: string;
}

/**
 * Address input with Places autocomplete and a map confirmation.
 *
 * Deliberately still an `<input>`, not a read-only button opening a modal like
 * the mobile picker: on desktop the address sits in a form beside eight other
 * fields, and making one of them behave differently from its neighbours costs
 * more than the modal buys.
 *
 * **Typed text that matches nothing is still accepted**, as an address without
 * a pin. A cafe being built on a road Google hasn't indexed is an ordinary case
 * here; refusing the address would block the form outright. The line under the
 * field says which of the two the user is about to save.
 *
 * Falls back to a plain input when no key is configured, so a checkout without
 * one still edits addresses normally.
 */
export function AddressPicker({
  value,
  onChange,
  placeholder,
  labels,
  disabled,
  className,
}: AddressPickerProps) {
  const [query, setQuery] = React.useState(value?.address ?? "");
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  /**
   * Whether the map is in drag-to-move mode. Off by default: most people find
   * their address by searching, and a map that moves under an accidental
   * scroll would quietly relocate a pin they were happy with.
   */
  const [adjusting, setAdjusting] = React.useState(false);
  const [isReversing, setIsReversing] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const settleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // The pin only belongs to the text it was resolved for. Editing the address
  // after picking a suggestion has to drop it — a marker that no longer matches
  // the words beside it is worse than no marker at all.
  const pinned = hasCoordinates(value) && value.address.trim() === query.trim();

  // The map is shown even before anything is picked, so a location can be
  // given by pointing rather than typing. It is draggable whenever there is no
  // pin yet (there is nothing to protect) or the user asked to move one.
  const showMap = env.mapsEnabled;
  const draggable = !pinned || adjusting;

  // Close the dropdown on an outside click. Without this it stays open over the
  // rest of the dialog and swallows clicks meant for the fields below.
  React.useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const runSearch = React.useCallback(async (input: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (input.trim().length < 2) {
      setSuggestions([]);
      setSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results = await autocomplete(input, { signal: controller.signal });
    if (controller.signal.aborted) return;

    setSuggestions(results);
    setSearched(true);
    setIsSearching(false);
    setIsOpen(true);
  }, []);

  // Debounced: one request per pause, not one per keystroke. Firing on every
  // character also makes results flicker, because responses for "Nguy" and
  // "Nguyen" can land out of order.
  React.useEffect(() => {
    const timer = setTimeout(() => void runSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handleType = (next: string) => {
    setQuery(next);
    // Report immediately so the parent's state matches what is on screen even
    // if the user never picks a suggestion, and drop any stale pin with it.
    onChange({ address: next, latitude: null, longitude: null });
  };

  // Instant: MapTiler returns coordinates inline with every suggestion, so
  // there is no second request and no post-choice failure state to handle.
  const handleChoose = (suggestion: PlaceSuggestion) => {
    setIsOpen(false);
    setSuggestions([]);
    setQuery(suggestion.fullText);
    onChange({
      address: suggestion.fullText,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  };

  /**
   * Fires continuously while the map is dragged.
   *
   * Coordinates are committed immediately — they are what the user is looking
   * at, and saving mid-lookup should still store the right point. Only the
   * address lookup waits for the drag to settle: reverse geocoding every frame
   * would fire hundreds of requests and flicker the field through every street
   * the map passed over.
   */
  const handlePinMoved = (latitude: number, longitude: number) => {
    // The visible text is kept while dragging so the field doesn't flash
    // empty; it is stale only until the lookup below lands.
    onChange({ address: query, latitude, longitude });

    // Dragging the first-pin map is itself a request to keep dragging: without
    // this the pin appears, `pinned` flips true and the map would freeze into
    // a still image after one nudge.
    setAdjusting(true);

    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(async () => {
      setIsReversing(true);
      const resolved = await reverseGeocode(latitude, longitude);
      setIsReversing(false);

      // On failure, label the pin with its own coordinates rather than the
      // street it was dragged away from. Either way the text and the address
      // must agree, because `pinned` compares them — leaving them out of step
      // would make the map vanish and silently drop a hand-placed pin.
      const next =
        resolved ?? {
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          latitude,
          longitude,
        };
      setQuery(next.address);
      onChange(next);
    }, 500);
  };

  // A drag in flight when the field unmounts would resolve against nothing.
  React.useEffect(
    () => () => {
      if (settleRef.current) clearTimeout(settleRef.current);
    },
    [],
  );

  const handleClear = () => {
    abortRef.current?.abort();
    setQuery("");
    setSuggestions([]);
    setSearched(false);
    setIsOpen(false);
    onChange({ address: "", latitude: null, longitude: null });
  };

  if (!env.mapsEnabled) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Input
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => handleType(event.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">{labels.unavailable}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="pl-8 pr-16"
          onChange={(event) => handleType(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isSearching ? (
            <Loader2
              className="size-3.5 animate-spin text-muted-foreground"
              aria-label={labels.searching}
            />
          ) : null}
          {query.length > 0 && !disabled ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={labels.clear}
              onClick={handleClear}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {suggestions.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.latitude},${suggestion.longitude},${suggestion.fullText}`}>
                  <button
                    type="button"
                    onClick={() => handleChoose(suggestion)}
                    className={cn(
                      interactiveRow,
                      "flex w-full items-start gap-2 px-3 py-2 text-left",
                    )}
                  >
                    <MapPin
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {suggestion.mainText}
                      </span>
                      {suggestion.secondaryText ? (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {suggestion.secondaryText}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : searched && !isSearching ? (
            <p className="px-3 py-2.5 text-[11px] text-muted-foreground">
              {labels.noResults}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Says which of the two outcomes saving will produce, before the user
          commits to it — the difference is invisible otherwise. */}
      {query.trim().length > 0 ? (
        <p
          className={cn(
            "flex items-center gap-1.5 text-[11px]",
            pinned ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}
        >
          {pinned ? (
            <Check className="size-3" aria-hidden />
          ) : (
            <MapPin className="size-3" aria-hidden />
          )}
          {pinned ? labels.pinned : labels.textOnly}
        </p>
      ) : null}

      {/* One DraggableMap instance, never two.
          
          The first drag on the "no pin yet" map immediately makes `pinned`
          true, so branching on `pinned` here would swap the component
          mid-gesture — remounting it, resetting its zoom and dropping the
          pointer capture the drag depends on. Rendering the same element with
          different coordinates keeps the gesture alive across that transition.

          Fixed pixel box: the tile grid is laid out against these exact
          numbers, and a fluid width would slide the centre pin off the
          coordinate it marks. */}
      {showMap ? (
        <div className="flex flex-col gap-1.5">
          {draggable ? (
            <DraggableMap
              latitude={pinned ? value.latitude : DEFAULT_PROXIMITY.lat}
              longitude={pinned ? value.longitude : DEFAULT_PROXIMITY.lng}
              onChange={handlePinMoved}
              width={520}
              height={200}
              className="max-w-full"
              labels={{
                hint: labels.dragHint,
                zoomIn: labels.zoomIn,
                zoomOut: labels.zoomOut,
              }}
            />
          ) : (
            <TileMap
              latitude={value.latitude}
              longitude={value.longitude}
              width={520}
              height={160}
              className="max-w-full rounded-md border border-border/60"
            />
          )}

          {pinned ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 gap-1.5 px-2 text-[11px]"
                onClick={() => setAdjusting((open) => !open)}
              >
                {adjusting ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <Move className="size-3" aria-hidden />
                )}
                {adjusting ? labels.adjustDone : labels.adjust}
              </Button>
              {isReversing ? (
                <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden />
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">{labels.placeFirstPin}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
