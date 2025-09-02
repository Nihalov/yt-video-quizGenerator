# File: backend/test_transcript.py

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

# A video ID that is known to have a transcript
TEST_VIDEO_ID = 'dQw4w9WgXcQ' 

print("--- Starting Transcript Test ---")

try:
    print(f"Attempting to fetch transcript for video ID: {TEST_VIDEO_ID}")
    # This is the exact same call as in your services.py
    transcript_list = YouTubeTranscriptApi.get_transcript(TEST_VIDEO_ID)
    transcript = " ".join([d['text'] for d in transcript_list])

    print("\n✅ SUCCESS! Transcript fetched successfully.")
    print("First 100 characters:", transcript[:100])

except (TranscriptsDisabled, NoTranscriptFound):
    print("\n❌ FAILED: Transcripts are disabled or not found for this video.")
except Exception as e:
    print(f"\n❌ FAILED with an unexpected error: {e}")

print("\n--- Test Finished ---")