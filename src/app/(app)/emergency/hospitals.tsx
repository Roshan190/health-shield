import { Redirect, type Href } from 'expo-router';

/** Legacy path — hospitals hub lives at `/hospitals` (D-025). */
export default function LegacyNearbyHospitalsRedirect() {
  return <Redirect href={'/hospitals' as Href} />;
}
