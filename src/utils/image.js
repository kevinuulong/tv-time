export function resizeImage(url, w = undefined) {
    console.warn("TODO: Download the images so we don't have to request them")
    const _url = new URL(url);
    if (w === undefined) _url.searchParams.delete("w");
    else _url.searchParams.set("w", w);

    return _url.toString();
}