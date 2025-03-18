package com.example.TicTacToe.modules

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.util.Log
import androidx.core.app.ActivityCompat
import java.io.IOException
import java.util.Locale
import java.util.TimeZone

class WorldIntegration(private val context: Context) {

    /**
     * Returns a formatted string with details: country, timezone, city, and street,
     * or an error message if the location cannot be obtained.
     *
     * This method checks for location permissions. If not granted,
     * and if the context is an Activity, it requests permissions (triggering the popup)
     * and returns a message prompting the user to try again after granting permissions.
     */
    @android.webkit.JavascriptInterface
    fun getLocation(): String {
        Log.d("WorldIntegration", "getLocation: Starting location request")
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

        // Check location permissions before accessing location
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            Log.e("WorldIntegration", "No location permissions")
            if (context is Activity) {
                // Request permissions if not granted; this will show the popup
                ActivityCompat.requestPermissions(
                    context,
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                    1001
                )
                return "Location permission requested. Please grant permission and try again."
            } else {
                return "Error: No location permissions and context is not an Activity."
            }
        }

        var location: Location? = null

        // Try to obtain location from NETWORK_PROVIDER
        try {
            location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            Log.d("WorldIntegration", "NETWORK_PROVIDER: Received location: $location")
        } catch (e: SecurityException) {
            Log.e("WorldIntegration", "NETWORK_PROVIDER: Permission error", e)
        }

        // If NETWORK_PROVIDER fails, try GPS_PROVIDER
        if (location == null) {
            try {
                location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                Log.d("WorldIntegration", "GPS_PROVIDER: Received location: $location")
            } catch (e: SecurityException) {
                Log.e("WorldIntegration", "GPS_PROVIDER: Permission error", e)
            }
        }

        // If a valid location is obtained, perform reverse geocoding to get address details
        if (location != null) {
            Log.d("WorldIntegration", "Valid location: Latitude=${location.latitude}, Longitude=${location.longitude}")
            val geocoder = Geocoder(context, Locale.getDefault())
            try {
                val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                Log.d("WorldIntegration", "Addresses received from Geocoder: $addresses")
                if (!addresses.isNullOrEmpty()) {
                    val address = addresses[0]
                    val country = address.countryName ?: "Unknown"
                    // Try to get the city; if not available, use subAdminArea
                    val city = address.locality ?: address.subAdminArea ?: "Unknown"
                    val street = address.thoroughfare ?: "Unknown"
                    val timeZone = TimeZone.getDefault().id
                    Log.d("WorldIntegration", "Detailed address: Country=$country, City=$city, Street=$street, Timezone=$timeZone")
                    return "Country: $country, Timezone: $timeZone, City: $city, Street: $street"
                } else {
                    Log.w("WorldIntegration", "No addresses found via Geocoder")
                    return "Error: No addresses found"
                }
            } catch (e: IOException) {
                Log.e("WorldIntegration", "Geocoder error", e)
                return "Error: Unable to reverse geocode location"
            }
        } else {
            Log.w("WorldIntegration", "No valid location obtained")
            return "Error: Unable to obtain location"
        }
    }
}
