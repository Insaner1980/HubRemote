fn main() {
    // Set the library search path for libmpv
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let mpv_lib_dir = format!("{}/mpv-dev", manifest_dir);

    println!("cargo:rustc-link-search=native={}", mpv_lib_dir);
    println!("cargo:rerun-if-changed=mpv-dev/libmpv-2.dll");

    tauri_build::build()
}
