const mediaApiUrl = import.meta.env.VITE_MEDIA_API_URL ?? "http://localhost:8001";

export type Advertisement = {
  id: string;
  title: string;
  price: string;
  category: string;
  location: string;
  description: string;
  image_url: string;
  status: string;
  created_at: string;
  source_text: string;
  extraction_confidence: string;
};

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code: string;
    message: string;
    details: { field: string | null; code: string; message: string }[];
  };
};

export type AdvertisementFormData = {
  title: string;
  price: string;
  category: string;
  location: string;
  description: string;
  image: File;
};

export type NewspaperExtraction = {
  detected_text: string;
  advertisement: Advertisement;
};

export type AdvertisementUpdateData = {
  title: string;
  price: string;
  category: string;
  location: string;
  description: string;
};

export async function listAdvertisements(): Promise<Advertisement[]> {
  const response = await fetch(`${mediaApiUrl}/api/v1/advertisements`);
  const body = (await response.json()) as ApiEnvelope<Advertisement[]>;

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Unable to load advertisements.");
  }

  return body.data;
}

export async function listReviewAdvertisements(): Promise<Advertisement[]> {
  const response = await fetch(`${mediaApiUrl}/api/v1/advertisements/review`);
  const body = (await response.json()) as ApiEnvelope<Advertisement[]>;

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Unable to load review queue.");
  }

  return body.data;
}

export async function createAdvertisement(
  advertisement: AdvertisementFormData
): Promise<Advertisement> {
  const body = new FormData();
  body.append("title", advertisement.title);
  body.append("price", advertisement.price);
  body.append("category", advertisement.category);
  body.append("location", advertisement.location);
  body.append("description", advertisement.description);
  body.append("image", advertisement.image);

  const response = await fetch(`${mediaApiUrl}/api/v1/advertisements`, {
    method: "POST",
    body
  });
  const envelope = (await response.json()) as ApiEnvelope<Advertisement>;

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? "Unable to create advertisement.");
  }

  return envelope.data;
}

export async function extractNewspaperArticle(image: File): Promise<NewspaperExtraction> {
  const body = new FormData();
  body.append("image", image);

  const response = await fetch(`${mediaApiUrl}/api/v1/newspaper-articles/extract`, {
    method: "POST",
    body
  });
  const envelope = (await response.json()) as ApiEnvelope<NewspaperExtraction>;

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? "Unable to extract newspaper article.");
  }

  return envelope.data;
}

export async function updateAdvertisement(
  advertisementId: string,
  advertisement: AdvertisementUpdateData
): Promise<Advertisement> {
  const response = await fetch(`${mediaApiUrl}/api/v1/advertisements/${advertisementId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(advertisement)
  });
  const envelope = (await response.json()) as ApiEnvelope<Advertisement>;

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? "Unable to update advertisement.");
  }

  return envelope.data;
}

export async function approveAdvertisement(advertisementId: string): Promise<Advertisement> {
  const response = await fetch(`${mediaApiUrl}/api/v1/advertisements/${advertisementId}/approve`, {
    method: "POST"
  });
  const envelope = (await response.json()) as ApiEnvelope<Advertisement>;

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? "Unable to approve advertisement.");
  }

  return envelope.data;
}
