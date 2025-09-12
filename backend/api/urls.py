# backend/api/urls.py
from django.urls import path
from .views import summarize_video, generate_quiz


urlpatterns = [
    path('summarize/', summarize_video, name='summarize-video'),
    path('quiz/', generate_quiz, name='generate-quiz')
]  