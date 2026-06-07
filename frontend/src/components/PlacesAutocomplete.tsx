import { useRef, useEffect, useState } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { MapPin } from "lucide-react";

const LIBRARIES: ("places")[] = ["places"];

interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (result: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Area in Lagos…",
  className = "",
}: PlacesAutocompleteProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Extract short area name: prefer the first address component (sublocality/locality)
    const component =
      place.address_components?.find((c) =>
        c.types.includes("sublocality_level_1") ||
        c.types.includes("sublocality") ||
        c.types.includes("locality")
      );
    const shortName = component?.long_name ?? place.name ?? place.formatted_address ?? "";

    onChange(shortName);
    onPlaceSelect({ address: shortName, lat, lng });
  };

  // Fallback to plain input when API key is missing
  if (!apiKey || !isLoaded) {
    return (
      <div className="relative flex-1 min-w-48">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-mid pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input pl-9 w-full text-small ${className}`}
          list="area-suggestions"
        />
        <datalist id="area-suggestions">
          {[
            "Ikeja", "Victoria Island", "Lekki", "Ajah", "Yaba", "Surulere",
            "Ikoyi", "Gbagada", "Maryland", "Ojodu", "Berger", "Agege",
            "Oshodi", "Isolo", "Festac", "Ikorodu",
          ].map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: "ng" },
        types: ["(regions)"],
        bounds: {
          // Lagos bounding box
          north: 6.7, south: 6.3, east: 3.7, west: 3.1,
        },
        strictBounds: false,
      }}
    >
      <div className="relative flex-1 min-w-48">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-mid pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input pl-9 w-full text-small ${className}`}
        />
      </div>
    </Autocomplete>
  );
}
