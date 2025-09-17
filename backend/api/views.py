# backend/api/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from youtube_transcript_api import YouTubeTranscriptApi
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@api_view(['POST'])
def summarize_video(request):
    """
    Receives a video URL, fetches the transcript, and returns both.
    """
    video_url = request.data.get('video_url')
    if not video_url:
        return Response({'error': 'Video URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # --- Get Video ID ---
        if "v=" in video_url:
            video_id = video_url.split('v=')[1].split('&')[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split('youtu.be/')[1].split('?')[0]
        else:
            return Response({'error': 'Invalid YouTube URL format.'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Get Transcript & Summary ---
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_transcript = ' '.join([d['text'] for d in transcript_list])

        if not full_transcript:
            return Response({'error': 'Transcript is empty.'}, status=status.HTTP_404_NOT_FOUND)
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        summary_prompt = f"Provide a concise, easy-to-read summary of the following educational video transcript, focusing on the key concepts.\n\nTranscript:\n{full_transcript}"
        summary_response = model.generate_content(summary_prompt)

        return Response({
            'transcript': full_transcript,
            'summary': summary_response.text
        })

    except Exception as e:
        print(f"Error in summarize_video: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def generate_quiz(request):
    """
    Receives transcript text and returns a JSON quiz.
    """
    transcript = request.data.get('transcript')
    if not transcript:
        return Response({'error': 'Transcript is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        quiz_prompt = f"""
        Based on the following transcript, generate a 5-question multiple-choice quiz.
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