# backend/api/urls.py
from django.urls import path
from .views import summarize_video

urlpatterns = [
    path('summarize/', summarize_video, name='summarize-video'),
]