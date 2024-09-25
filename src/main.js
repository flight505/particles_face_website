import MainScene from './js/components/scene.js'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'

gsap.registerPlugin(Draggable)

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded')
    const mainScene = new MainScene()
    console.log('MainScene initialized:', mainScene)

    const cursor = document.querySelector(".cursor")
    const targets = document.querySelectorAll(".target")

    let cursorPosition = { x: 0, y: 0 }
    let animationFrameId = null

    function updateCursor(e) {
        cursorPosition.x = e.clientX
        cursorPosition.y = e.clientY

        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animateCursor)
        }
    }

    function animateCursor() {
        animationFrameId = null

        let closestTarget = null
        let closestDistance = Infinity

        targets.forEach(target => {
            const rect = target.getBoundingClientRect()
            const targetCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            }

            const distance = Math.hypot(
                targetCenter.x - cursorPosition.x,
                targetCenter.y - cursorPosition.y
            )

            if (distance < closestDistance) {
                closestTarget = target
                closestDistance = distance
            }
        })

        if (closestTarget && closestDistance < closestTarget.getBoundingClientRect().width) {
            const rect = closestTarget.getBoundingClientRect()
            const targetCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            }

            const angle = Math.atan2(targetCenter.y - cursorPosition.y, targetCenter.x - cursorPosition.x)
            const distanceRatio = closestDistance / (rect.width / 2)

            gsap.to(cursor, {
                left: targetCenter.x - Math.cos(angle) * closestDistance * 0.5,
                top: targetCenter.y - Math.sin(angle) * closestDistance * 0.5,
                height: rect.height,
                width: rect.width,
                duration: 0.2
            })

            gsap.to(closestTarget.querySelector(".text"), {
                x: -Math.cos(angle) * closestDistance * 0.5 * distanceRatio,
                y: -Math.sin(angle) * closestDistance * 0.5 * distanceRatio,
                duration: 0.2
            })
        } else {
            gsap.to(cursor, {
                left: cursorPosition.x,
                top: cursorPosition.y,
                height: 12,
                width: 12,
                duration: 0.2
            })

            targets.forEach(target => {
                gsap.to(target.querySelector(".text"), {
                    x: 0,
                    y: 0,
                    duration: 0.2
                })
            })
        }
    }

    function handleNavigation(targetText) {
        const sections = document.querySelectorAll('section')
        sections.forEach(section => {
            section.style.display = 'none'
        })

        const targetSection = document.getElementById(targetText.toLowerCase())
        if (targetSection) {
            targetSection.style.display = 'block'
        }
    }

    targets.forEach(target => {
        target.addEventListener('click', () => {
            const targetText = target.querySelector('.text').textContent
            handleNavigation(targetText)
        })
    })

    const contactForm = document.getElementById('contact-form')
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault()
            const email = document.getElementById('email').value
            const message = document.getElementById('message').value
            console.log('Form submitted:', { email, message })
            // Here you would typically send this data to a server
            alert('Thank you for your message. We will get back to you soon!')
            contactForm.reset()
        })
    }

    document.addEventListener("mousemove", updateCursor, { passive: true })
})

