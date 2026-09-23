# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Ditambahkan saat mengaktifkan isMinifyEnabled/isShrinkResources ---
# Tanpa aturan ini, obfuscation/shrinking berisiko merusak library yang
# bergantung pada reflection atau generic signature saat runtime.

# Room entities & DAO (data class field name dipakai untuk mapping kolom SQLite)
-keep class com.example.data.model.** { *; }
-keep interface com.example.data.local.*Dao { *; }
-dontwarn androidx.room.**

# Moshi (JSON model reflection + generated adapters)
-keepclasseswithmembers class * {
    @com.squareup.moshi.* <methods>;
}
-keep @com.squareup.moshi.JsonQualifier interface *
-keepnames @com.squareup.moshi.JsonClass class *
-keep class **JsonAdapter { *; }
-dontwarn com.squareup.moshi.**

# Retrofit & OkHttp (dipakai lewat template AI Studio; aman dipertahankan
# meskipun app ini offline-first, agar tidak crash jika suatu saat dipakai)
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault
-keep class retrofit2.** { *; }
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-dontwarn okio.**

# Firebase AI / App Check
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }

# Kotlin coroutines
-dontwarn kotlinx.coroutines.**
