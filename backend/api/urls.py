# backend/api/urls.py
from django.urls import path
from .views import summarize_video, generate_quiz, transcribe_video


urlpatterns = [
    path('summarize/', summarize_video, name='summarize-video'),
    path('quiz/', generate_quiz, name='generate-quiz'),
    path('transcribe/', transcribe_video, name='transcribe-video')
]  