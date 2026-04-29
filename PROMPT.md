Right now in localStorage with the key agiletv.settings

We are currently storing the following object:

{
   "darkMode":true,
   "streamingFormats":{
      "hls":".m3u8",
      "dash":".mpd",
      "smooth":".Manifest"
   },
   "drmPaths":{
      "clear":"",
      "widevine":"/widevine",
      "fairplay":"/fairplay",
      "playready":"/playready"
   },
   "distribution":{
      "origin":{
         "live":"https://origin.example.com/live",
         "vod":"https://origin.example.com/vod",
         "fast":"https://origin.example.com/fast"
      },
      "cdn":{
         "live":{
            "akamai":"https://akamai.example.com/live",
            "fastly":"https://fastly.example.com/live"
         },
         "vod":{
            "akamai":"https://akamai.example.com/vod",
            "fastly":"https://fastly.example.com/vod"
         },
         "fast":{
            "akamai":"https://akamai.example.com/fast",
            "fastly":"https://fastly.example.com/fast"
         }
      }
   }
}

Excluding darkMode, we are going to get rid of all that object, and replace it with an actual Enigma API call.

Obviously the Enigma API call has to go through the NextJS API first.

The HTTP Request to fetch the settings is the following

[GET] {{ENIGMA_BASE_URL}}/setting-vms
Response Status: 200
Response Object:
{
   "streamingFormats":{
      "hls":".m3u8",
      "dash":".mpd",
      "smooth":".Manifest"
   },
   "drmPaths":{
      "clear":"",
      "widevine":"/widevine",
      "fairplay":"/fairplay",
      "playready":"/playready"
   },
   "akamai":{
      "live":"https://directos.mediasetinfinity.es",
      "vod":"https://vbd.mediasetinfinity.es",
      "fast":"https://fast.mediasetinfinity.es"
   },
   "fastly":{
      "live":"https://livek.mediasetinfinity.es",
      "vod":"https://vbdk.mediasetinfinity.es",
      "fast":"https://fastk.mediasetinfinity.es"
   },
   "origin":{
      "live":"https://ingest.d564c782cd00a88bfa6a3e709e9b2d173c76f81d.es",
      "vod":"https://vod.d564c782cd00a88bfa6a3e709e9b2d173c76f81d.es",
      "fast":"https://vc.d564c782cd00a88bfa6a3e709e9b2d173c76f81d.es"
   }
}

---

For updating the settings, the request will be the following:

[PUT] {{ENIGMA_BASE_URL}}/setting-vms
Request body: 
{
   "streamingFormats":{
      "hls":".m3u8",
      "dash":".mpd",
      "smooth":".Manifest"
   },
   "drmPaths":{
      "clear":"",
      "widevine":"/widevine",
      "fairplay":"/fairplay",
      "playready":"/playready"
   },
   "akamai":{
      "live":"https://directos.mediasetinfinity.es",
      "vod":"https://vbd.mediasetinfinity.es",
      "fast":"https://fast.mediasetinfinity.es"
   },
   "fastly":{
      "live":"https://livek.mediasetinfinity.es",
      "vod":"https://vbdk.mediasetinfinity.es",
      "fast":"https://fastk.mediasetinfinity.es"
   },
   "origin":{
      "live":"https://ingest.d564c782cd00a88bfa6a3e709e9b2d173c76f81d.es",
      "vod":"https://vod.d564c782cd00a88bfa6a3e709e9b2d173c76f81d.es",
      "fast":"https://vc.d564c782cd00a88bfa6a3e709e9b2d173c76f81d.es"
   }
}
Response Status: 200
Response Body:
{
   "msg":"Settings saved successfully."
}
---

So we need to locate all the places where we are currently using the current settings from localStorage and replace it with this new implementation using the object that the Enigma API returns.

---

The settings page now will only be available for ADMINs user.

And if someone who is not ADMIN tries to access the /settings page directly from the url it should be redirected to the dashboard with a message saying "You are not allowed to access this page."

---

For anything that might require clarification, ask, don't assume.