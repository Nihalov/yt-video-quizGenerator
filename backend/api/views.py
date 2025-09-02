from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from youtube_transcript_api import YouTubeTranscriptApi
from transformers import pipeline

@api_view(['POST'])
def summarize_video(request):
    """
    API endpoint to get transcript and summarize a YouTube video.
    Expects a POST request with {'video_url': '...'}
    """
    video_url = request.data.get('video_url')
    if not video_url:
        return Response({'error': 'Video URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Extract video ID from URL
        if "v=" in video_url:
            video_id = video_url.split('v=')[1].split('&')[0]
        elif "youtu.be/" in video_url:
            video_id = video_url.split('youtu.be/')[1].split('?')[0]
        else:
             return Response({'error': 'Invalid YouTube URL format.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Transcript Extraction
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript = ' '.join([d['text'] for d in transcript_list])

        # 2. Summarization


        
        return Response({
            'transcript': transcript
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)