# backend/api/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
import yt_dlp
import whisper
from youtube_transcript_api import YouTubeTranscriptApi # <-- Add this import back

# --- Configuration ---
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
WHISPER_MODEL = whisper.load_model("base", device="cpu")

# --- Helper Functions for the Whisper Pipeline ---
# (download_audio_from_youtube and transcribe_audio_with_whisper functions remain the same)
def download_audio_from_youtube(video_url):
    """
    Downloads audio from a YouTube URL as an MP3 and returns the file path.
    """
    if not os.path.exists('audio'):
        os.makedirs('audio')

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': 'audio/%(id)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=True)
            video_id = info_dict.get('id', None)
            file_path = f"audio/{video_id}.mp3"
        return file_path
    except Exception as e:
        print(f"Error during audio download: {e}")
        return None

def transcribe_audio_with_whisper(audio_path):
    """
    Transcribes an audio file using the pre-loaded Whisper model.
    """
    if not audio_path or not os.path.exists(audio_path):
        return None
    
    try:
        result = WHISPER_MODEL.transcribe(audio_path, fp16=False)
        print("----------transcript Done------------")
        return result["text"]
    except Exception as e:
        print(f"Error during transcription: {e}")
        return None

# --- API Views ---

@api_view(['POST'])
def summarize_video(request):
    """
    Receives a video URL. Tries to fetch the transcript via API first.
    If it fails, it falls back to the Whisper pipeline.
    Finally, it returns the transcript and a summary from Gemini.
    """
    video_url = request.data.get('video_url')
    if not video_url:
        return Response({'error': 'Video URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

    audio_file_path = None
    full_transcript = None

    try:
        # --- Get Video ID ---
        if "v=" in video_url:
            video_id = video_url.split('v=')[1].split('&')[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split('youtu.be/')[1].split('?')[0]
        else:
            return Response({'error': 'Invalid YouTube URL format.'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Step 1: Try the fast youtube_transcript_api first ---
        try:
            print("Attempting to fetch transcript via API...")
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_transcript = ' '.join([d['text'] for d in transcript_list])
            print("Transcript successfully fetched via API.")
        except Exception as api_error:
            print(f"API transcript not available ({api_error}). Falling back to Whisper.")
            # --- Step 2: Fallback to Whisper pipeline ---
            audio_file_path = download_audio_from_youtube(video_url)
            if not audio_file_path:
                return Response({'error': 'Failed to download audio for transcription.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            full_transcript = transcribe_audio_with_whisper(audio_file_path)
            if not full_transcript:
                return Response({'error': 'Failed to transcribe audio with Whisper.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # --- Step 3: Summarize with Gemini using the obtained transcript ---
        if not full_transcript:
            return Response({'error': 'Could not obtain transcript.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        model = genai.GenerativeModel('gemini-1.5-flash')
        summary_prompt = f"Provide a concise, easy-to-read summary of the following educational video transcript, focusing on the key concepts.\n\nTranscript:\n{full_transcript}"
        summary_response = model.generate_content(summary_prompt)

        return Response({
            'transcript': full_transcript,
            'summary': summary_response.text
        })

    except Exception as e:
        print(f"An unexpected error occurred in summarize_video: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    finally:
        # --- Step 4: Clean up the audio file if it was created ---
        if audio_file_path and os.path.exists(audio_file_path):
            os.remove(audio_file_path)


@api_view(['POST'])
def generate_quiz(request):
    """
    Receives transcript text and returns a JSON quiz.
    (This view remains unchanged as it works with any transcript text)
    """
    transcript = request.data.get('transcript')
    if not transcript:
        return Response({'error': 'Transcript is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        model = genai.GenerativeModel('gemini-2.5-pro')
        quiz_prompt = f"""
        Based on the following transcript, generate a 7-question multiple-choice quiz.
        Return the quiz as a valid JSON array where each object has "question", "options" (an array of 4 strings), and "answer" (the string of the correct option).

        Transcript:
        {transcript}
        """
        quiz_response = model.generate_content(quiz_prompt)
        
        quiz_json_string = quiz_response.text.replace("```json", "").replace("```", "").strip()
        quiz_data = json.loads(quiz_json_string)
        
        return Response({'quiz': quiz_data})

    except Exception as e:
        print(f"Error in generate_quiz: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)