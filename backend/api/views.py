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
# from youtube_transcript_api import YouTubeTranscriptApi
import logging

# --- Configuration ---
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize Whisper model once
try:
    WHISPER_MODEL = whisper.load_model("base", device="cpu")
except Exception as e:
    logging.error(f"Failed to load Whisper model: {e}")
    WHISPER_MODEL = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Helper Functions ---
def download_audio_from_youtube(video_url):
    if not os.path.exists('audio'):
        os.makedirs('audio')

    ydl_opts = {
        'format': 'm4a/bestaudio/best',
        'outtmpl': 'audio/%(id)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True,
        'log_warnings': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(video_url, download=True)
            video_id = info_dict.get('id', None)
            file_path = f"audio/{video_id}.mp3"
        return file_path
    except Exception as e:
        logging.error(f"Error during audio download for {video_url}: {e}")
        return None

def transcribe_audio_with_whisper(audio_path):
    if not WHISPER_MODEL:
        logging.error("Whisper model not loaded. Cannot transcribe.")
        return None
    if not audio_path or not os.path.exists(audio_path):
        logging.warning(f"Audio file not found for transcription: {audio_path}")
        return None
    
    try:
        logging.info(f"Starting Whisper transcription for {audio_path}...")
        result = WHISPER_MODEL.transcribe(audio_path, fp16=False)
        logging.info("Whisper transcription Done.")
        return result["text"]
    except Exception as e:
        logging.error(f"Error during Whisper transcription for {audio_path}: {e}")
        return None


# --- API Views ---
@api_view(['POST'])
def summarize_video(request):
    """
    Summarize video. If transcript already given, use it directly.
    Otherwise, fetch transcript via API or Whisper.
    """
    video_url = request.data.get('video_url')
    transcript = request.data.get('transcript')  # <-- reuse transcript if available
    if not video_url and not transcript:
        return Response({'error': 'Video URL or transcript is required.'}, status=status.HTTP_400_BAD_REQUEST)

    audio_file_path = None
    full_transcript = transcript

    try:
        # Step 1: If transcript not provided, try YouTube API / Whisper
        if not full_transcript and video_url:
            video_id = None
            if "v=" in video_url:
                video_id = video_url.split('v=')[1].split('&')[0]
            elif "youtu.be/" in video_url:
                video_id = video_url.split('youtu.be/')[1].split('?')[0]
            
            # if video_id:
            #     try:
            #         logging.info(f"Fetching transcript via YouTubeTranscriptApi for video ID: {video_id}")
            #         transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            #         full_transcript = ' '.join([d['text'] for d in transcript_list])
            #     except Exception as e:
            #         logging.warning(f"API transcript not available: {e}. Falling back to Whisper.")
            
            if not full_transcript:
                audio_file_path = download_audio_from_youtube(video_url)
                if audio_file_path:
                    full_transcript = transcribe_audio_with_whisper(audio_file_path)

        if not full_transcript:
            return Response({'error': 'No transcript could be generated.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Step 2: Generate Summary
        model = genai.GenerativeModel('gemini-2.5-flash')
        summary_prompt = f"""
        Provide a structured, easy-to-read short summary of the following educational video transcript. Use markdown for formatting. Use bolded headings for main sections and bullet points for key details under each heading. Directly provide summary, no need for introductory phrases like "Here's a structured summary..."
        Transcript:
        {full_transcript}
        """
        summary_response = model.generate_content(summary_prompt)
        summary_text = summary_response.text

        return Response({'transcript': full_transcript, 'summary': summary_text})

    except Exception as e:
        logging.error(f"Error in summarize_video: {e}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    finally:
        if audio_file_path and os.path.exists(audio_file_path):
            try:
                os.remove(audio_file_path)
            except OSError as e:
                logging.error(f"Error removing audio file {audio_file_path}: {e}")


@api_view(['POST'])
def generate_quiz(request):
    """
    Generate quiz. If transcript already given, use it directly.
    """
    transcript = request.data.get('transcript')
    video_url = request.data.get('video_url')

    if not transcript and not video_url:
        return Response({'error': 'Transcript or Video URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # If transcript missing but video_url exists, fetch transcript
        if not transcript and video_url:
            video_id = None
            if "v=" in video_url:
                video_id = video_url.split('v=')[1].split('&')[0]
            elif "youtu.be/" in video_url:
                video_id = video_url.split('youtu.be/')[1].split('?')[0]
            
            # if video_id:
            #     try:
            #         transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            #         transcript = ' '.join([d['text'] for d in transcript_list])
            #     except Exception as e:
            #         logging.warning(f"Transcript API failed: {e}")
            
            if not transcript:
                audio_file_path = download_audio_from_youtube(video_url)
                transcript = transcribe_audio_with_whisper(audio_file_path)

        if not transcript:
            return Response({'error': 'Transcript could not be generated.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Generate Quiz
        model = genai.GenerativeModel('gemini-2.5-flash')
        quiz_prompt = f"""
        Based on the following transcript, generate a 7-question multiple-choice quiz.
        Each question should have 4 options and 1 correct answer.
        Return as valid JSON array with "question", "options", "answer".
        
        Transcript:
        {transcript}
        """
        quiz_response = model.generate_content(quiz_prompt)
        quiz_json_string = quiz_response.text.replace("```json", "").replace("```", "").strip()
        quiz_data = json.loads(quiz_json_string)

        if not isinstance(quiz_data, list):
            raise ValueError("Invalid quiz format")

        return Response({'quiz': quiz_data, 'transcript': transcript})

    except Exception as e:
        logging.error(f"Error in generate_quiz: {e}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def transcribe_video(request):
    """
    Standalone transcript fetch. Used only if needed explicitly.
    """
    video_url = request.data.get('video_url')
    if not video_url:
        return Response({'error': 'Video URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

    audio_file_path = None
    transcript = None

    try:
        video_id = None
        if "v=" in video_url:
            video_id = video_url.split('v=')[1].split('&')[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split('youtu.be/')[1].split('?')[0]

        # if video_id:
        #     try:
        #         transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        #         transcript = ' '.join([d['text'] for d in transcript_list])
        #     except Exception as e:
        #         logging.warning(f"Transcript API failed: {e}")

        if not transcript:
            audio_file_path = download_audio_from_youtube(video_url)
            transcript = transcribe_audio_with_whisper(audio_file_path)

        if not transcript:
            return Response({'error': 'Transcript could not be generated.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'transcript': transcript})

    except Exception as e:
        logging.error(f"Error in transcribe_video: {e}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    finally:
        if audio_file_path and os.path.exists(audio_file_path):
            try:
                os.remove(audio_file_path)
            except OSError as e:
                logging.error(f"Error removing audio file {audio_file_path}: {e}")
